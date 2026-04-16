"""
Dagelijkse e-mailbriefing voor invorderingsspecialisten bij de Belastingdienst.

Dit script:
  1. Voert een dagelijkse websearch uit (via agent.py)
  2. Laat Claude de bevindingen omzetten naar een prioriteitsgestuurde HTML-e-mail
  3. Verstuurt de e-mail via Gmail

Gmail App Password instellen (eenmalig):
  1. Ga naar https://myaccount.google.com/security
  2. Zet 2-stapsverificatie aan (vereist)
  3. Ga naar https://myaccount.google.com/apppasswords
  4. Maak een App Password aan voor "Mail"
  5. Vul het 16-cijferige wachtwoord in bij GMAIL_APP_PASSWORD in je .env

Gebruik:
    python mail_agent.py              # verstuur briefing e-mail
    python mail_agent.py --dry-run    # toon HTML in terminal, verstuur niet

Automatisering (cron, elke werkdag om 07:30):
    30 7 * * 1-5 cd /pad/naar/Ozora && python mail_agent.py
"""

import anthropic
import argparse
import os
import smtplib
import sys
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

HTML STYLING VEREISTEN:
- Gebruik inline CSS (e-mailclients ondersteunen geen externe CSS)
- Professionele, cleane uitstraling — donkerblauw (#1a3a5c) als hoofdkleur
- Urgente items in een rode kaart (#fff0f0, rode rand links)
- Relevante items in een gele/oranje kaart (#fffbf0, oranje rand links)
- Ter kennisname in een groene kaart (#f0fff4, groene rand links)
- Leesbaar lettertype: Arial of sans-serif, 14px
- Maximale breedte 680px, gecentreerd
- Elke bevinding als aparte kaart met bron en datum

Geef ALLEEN de HTML terug, geen uitleg of markdown omheen.

RUWE BRIEFING:
{briefing}
"""


def generate_html_email(briefing: str, today: str) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    client = anthropic.Anthropic(api_key=api_key)

    print("HTML e-mail genereren met Claude...")

    full_html = []

    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=8000,
        system=(
            "Je bent een expert in het schrijven van professionele HTML-e-mails "
            "voor overheidsmedewerkers in Nederland. Je schrijft altijd in het Nederlands. "
            "Je geeft uitsluitend geldige HTML terug met inline CSS."
        ),
        messages=[
            {
                "role": "user",
                "content": EMAIL_PROMPT.format(briefing=briefing),
            }
        ],
    ) as stream:
        for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "text_delta":
                    print(".", end="", flush=True)
                    full_html.append(event.delta.text)

    print(" klaar.")
    return "".join(full_html)


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

    # Platte tekst fallback
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
        description="Dagelijkse HTML-briefing e-mail voor invorderingsspecialisten"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Genereer HTML maar verstuur de e-mail niet (toon in terminal)",
    )
    args = parser.parse_args()

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Fout: ANTHROPIC_API_KEY niet gevonden in .env", file=sys.stderr)
        sys.exit(1)

    today = date.today().strftime("%d %B %Y")

    # Stap 1: websearch briefing ophalen
    print("Stap 1/3: Websearch briefing ophalen...\n")
    briefing_text = run_briefing(save=False)

    # Stap 2: HTML e-mail genereren
    print("\nStap 2/3: HTML e-mail genereren...")
    html_content = generate_html_email(briefing_text, today)

    # Stap 3: versturen of tonen
    if args.dry_run:
        print("\nStap 3/3: Dry-run — HTML wordt getoond, niet verstuurd.\n")
        print("=" * 70)
        print(html_content)
        print("=" * 70)

        # Sla ook op als HTML-bestand voor preview in browser
        preview_file = f"preview_{date.today().strftime('%Y-%m-%d')}.html"
        with open(preview_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\nHTML-preview opgeslagen als: {preview_file}")
        print("Open dit bestand in je browser om de e-mail te bekijken.")
    else:
        print("\nStap 3/3: E-mail versturen via Gmail...")
        send_gmail(html_content, today)


if __name__ == "__main__":
    main()
