"""
Dagelijkse e-mailbriefing voor invorderingsspecialisten bij de Belastingdienst.

Dit script:
  1. Voert een dagelijkse websearch uit (via agent.py)
  2. Laat Claude de bevindingen omzetten naar een gestylede HTML-e-mail met klikbare links
  3. Stuurt urgente items als WhatsApp-bericht via CallMeBot
  4. Verstuurt de volledige e-mail via Gmail

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GMAIL APP PASSWORD instellen (eenmalig):
  1. Ga naar https://myaccount.google.com/security
  2. Zet 2-stapsverificatie aan (vereist)
  3. Ga naar https://myaccount.google.com/apppasswords
  4. Maak een App Password aan → vul het 16-cijferige wachtwoord in bij GMAIL_APP_PASSWORD in .env

CALLMEBOT WHATSAPP instellen (eenmalig):
  1. Sla dit nummer op in je telefoon: +34 644 65 21 69  (naam: CallMeBot)
  2. Stuur via WhatsApp het bericht: I allow callmebot to send me messages
  3. Je ontvangt een API key — vul die in bij CALLMEBOT_API_KEY in .env
  4. Vul je telefoonnummer in internationaal formaat in bij CALLMEBOT_PHONE (bijv. 31612345678)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gebruik:
    python mail_agent.py              # volledig uitvoeren (e-mail + WhatsApp)
    python mail_agent.py --dry-run    # preview HTML, geen e-mail of WhatsApp

Automatisering (cron, elke werkdag om 07:30):
    30 7 * * 1-5 cd /pad/naar/Ozora && python mail_agent.py
"""

import anthropic
import argparse
import os
import re
import smtplib
import sys
import urllib.parse
import urllib.request
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

from agent import run_briefing

load_dotenv()

EMAIL_PROMPT = """Je ontvangt hieronder de ruwe dagelijkse briefing voor een invorderingsspecialist bij de Nederlandse Belastingdienst.

Jouw taak is om deze informatie om te zetten naar een professionele, overzichtelijke HTML-e-mail.

STRUCTUUR VAN DE E-MAIL:
1. Header met datum en titel
2. "🔴 Urgent & Belangrijk" sectie — maximaal 3 items die vandaag echt actie of aandacht vereisen
3. "🟡 Relevant nieuws" sectie — overige belangrijke maar niet urgente bevindingen per categorie
4. "🟢 Ter kennisname" sectie — achtergrondinfo, minder tijdgevoelig
5. Footer met disclaimer

PRIORITERING:
- 🔴 Urgent: nieuwe wetgeving die direct geldt, deadline-gevoelige uitspraken, beleidswijzigingen per direct
- 🟡 Relevant: nieuwe jurisprudentie, aangekondigde wijzigingen, politieke ontwikkelingen
- 🟢 Ter kennisname: achtergrondartikelen, langetermijnontwikkelingen, algemeen nieuws

HTML STYLING VEREISTEN (gebruik uitsluitend inline CSS):
- Hoofdkleur donkerblauw: #1a3a5c
- Maximale breedte 680px, gecentreerd, achtergrond #f4f6f9
- Header: donkerblauwe achtergrond, witte tekst, padding 24px
- Kaarten: witte achtergrond, border-radius 8px, box-shadow licht, margin-bottom 12px, padding 16px
- Urgente kaarten: linkerborderkleur #e53e3e (4px), achtergrond #fff5f5
- Relevante kaarten: linkerborderkleur #dd6b20 (4px), achtergrond #fffaf0
- Ter kennisname kaarten: linkerborderkleur #38a169 (4px), achtergrond #f0fff4
- Sectietitels: 16px bold, bijpassende kleur per sectie
- Leesbaar lettertype: Arial, sans-serif, 14px, regelafstand 1.6
- Footer: grijs (#718096), kleine tekst, italic

KLIKBARE LINKS (VERPLICHT):
- Elke bevinding MOET een klikbare bronlink bevatten
- Gebruik: <a href="VOLLEDIGE_URL" style="color:#1a3a5c;font-weight:bold;">Bekijk bron →</a>
- Zet de link aan het einde van elke kaart op een nieuwe regel
- Als een URL beschikbaar is in de briefing, gebruik die dan exact
- Als geen URL beschikbaar is, gebruik dan de hoofdwebsite van de bron (bijv. https://www.rechtspraak.nl)

KAARTSTRUCTUUR per bevinding:
<div style="...kaart stijl...">
  <div style="font-size:12px;color:#718096;margin-bottom:6px;">📅 [DATUM] &nbsp;|&nbsp; 🏛️ [BRON]</div>
  <div style="font-weight:bold;margin-bottom:8px;">[TITEL/ONDERWERP]</div>
  <div style="color:#4a5568;">[SAMENVATTING in 2-3 zinnen]</div>
  <div style="margin-top:10px;"><a href="[URL]" style="color:#1a3a5c;font-weight:bold;text-decoration:none;">Bekijk bron →</a></div>
</div>

Geef ALLEEN de HTML terug, geen uitleg of markdown omheen.

RUWE BRIEFING:
{briefing}
"""

URGENT_EXTRACT_PROMPT = """Analyseer de onderstaande dagelijkse briefing voor een invorderingsspecialist bij de Belastingdienst.

Extraheer uitsluitend de URGENTE items — maximaal 3 — die vandaag directe actie of aandacht vereisen.

Geef de output als een compacte platte tekst (geen HTML, geen markdown) geschikt voor WhatsApp:

🚨 URGENTE BRIEFING BELASTINGDIENST — {datum}

[voor elk urgent item:]
🔴 [Korte titel]
[1-2 zinnen uitleg]
🔗 [URL als beschikbaar, anders weglaten]

Sluit af met:
📋 Bekijk de volledige briefing in je e-mail.

Als er geen urgente items zijn, stuur dan:
✅ Geen urgente zaken vandaag. Bekijk je e-mail voor de volledige briefing.

BRIEFING:
{briefing}
"""


def generate_html_email(briefing: str, today: str) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    print("HTML e-mail genereren met Claude...")
    full_html = []

    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=8000,
        system=(
            "Je bent een expert in het schrijven van professionele HTML-e-mails "
            "voor overheidsmedewerkers in Nederland. Je schrijft altijd in het Nederlands. "
            "Je geeft uitsluitend geldige HTML terug met inline CSS. "
            "Elke bevinding bevat een klikbare bronlink."
        ),
        messages=[{"role": "user", "content": EMAIL_PROMPT.format(briefing=briefing)}],
    ) as stream:
        for event in stream:
            if event.type == "content_block_delta" and event.delta.type == "text_delta":
                print(".", end="", flush=True)
                full_html.append(event.delta.text)

    print(" klaar.")
    return "".join(full_html)


def extract_urgent_whatsapp_message(briefing: str, today: str) -> str:
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    print("Urgente items extraheren voor WhatsApp...")
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": URGENT_EXTRACT_PROMPT.format(briefing=briefing, datum=today),
            }
        ],
    )
    message = response.content[0].text.strip()
    print("klaar.")
    return message


def send_whatsapp(message: str) -> None:
    phone = os.getenv("CALLMEBOT_PHONE")
    api_key = os.getenv("CALLMEBOT_API_KEY")

    if not phone or not api_key:
        print(
            "⚠️  WhatsApp overgeslagen: CALLMEBOT_PHONE of CALLMEBOT_API_KEY niet ingesteld in .env",
            file=sys.stderr,
        )
        return

    encoded_message = urllib.parse.quote(message)
    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_message}&apikey={api_key}"

    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            status = response.status
            if status == 200:
                print(f"✅ WhatsApp-bericht verstuurd naar +{phone}")
            else:
                print(f"⚠️  WhatsApp: onverwachte statuscode {status}", file=sys.stderr)
    except Exception as e:
        print(f"⚠️  WhatsApp verzenden mislukt: {e}", file=sys.stderr)


def send_gmail(html_content: str, today: str) -> None:
    gmail_address = os.getenv("GMAIL_ADDRESS")
    gmail_app_password = os.getenv("GMAIL_APP_PASSWORD")
    recipient = os.getenv("RECIPIENT_EMAIL", gmail_address)

    if not gmail_address or not gmail_app_password:
        print(
            "Fout: GMAIL_ADDRESS of GMAIL_APP_PASSWORD niet ingesteld in .env",
            file=sys.stderr,
        )
        sys.exit(1)

    subject = f"📋 Dagelijkse Briefing Invorderingsspecialist — {today}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = gmail_address
    msg["To"] = recipient

    plain_text = (
        f"Dagelijkse Briefing Invorderingsspecialist — {today}\n\n"
        "Bekijk deze e-mail in een HTML-compatibele e-mailclient voor de volledige opmaak."
    )
    msg.attach(MIMEText(plain_text, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    print(f"E-mail versturen naar {recipient}...")
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.ehlo()
        server.starttls()
        server.login(gmail_address, gmail_app_password)
        server.sendmail(gmail_address, recipient, msg.as_string())

    print(f"✅ E-mail succesvol verstuurd naar {recipient}")


def main():
    parser = argparse.ArgumentParser(
        description="Dagelijkse HTML-briefing e-mail met WhatsApp-alerts voor invorderingsspecialisten"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Genereer alles maar verstuur geen e-mail of WhatsApp",
    )
    args = parser.parse_args()

    if not os.getenv("ANTHROPIC_API_KEY"):
        print("Fout: ANTHROPIC_API_KEY niet gevonden in .env", file=sys.stderr)
        sys.exit(1)

    today = date.today().strftime("%d %B %Y")

    # Stap 1: websearch briefing ophalen
    print("Stap 1/4: Websearch briefing ophalen...\n")
    briefing_text = run_briefing(save=False)

    # Stap 2: HTML e-mail genereren met klikbare links
    print("\nStap 2/4: HTML e-mail genereren met klikbare bronlinks...")
    html_content = generate_html_email(briefing_text, today)

    # Stap 3: urgente items extraheren voor WhatsApp
    print("\nStap 3/4: Urgente items extraheren voor WhatsApp...")
    whatsapp_message = extract_urgent_whatsapp_message(briefing_text, today)

    # Stap 4: versturen
    if args.dry_run:
        print("\nStap 4/4: Dry-run — niets wordt verstuurd.\n")

        preview_file = f"preview_{date.today().strftime('%Y-%m-%d')}.html"
        with open(preview_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"HTML-preview opgeslagen als: {preview_file}")
        print("Open dit bestand in je browser om de e-mail te bekijken.\n")

        print("─" * 50)
        print("WhatsApp-bericht (voorbeeld):")
        print("─" * 50)
        print(whatsapp_message)
        print("─" * 50)
    else:
        print("\nStap 4/4: Versturen...")
        send_whatsapp(whatsapp_message)
        send_gmail(html_content, today)
        print("\n✅ Dagelijkse briefing volledig verstuurd.")


if __name__ == "__main__":
    main()
