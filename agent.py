"""
Dagelijkse briefing agent voor invorderingsspecialisten bij de Belastingdienst.

Gebruik:
    python agent.py                  # print naar terminal
    python agent.py --save           # sla rapport op als bestand
    python agent.py --save --output rapport.txt

Automatisering (cron, elke werkdag om 07:30):
    30 7 * * 1-5 cd /pad/naar/Ozora && python agent.py --save
"""

import anthropic
import argparse
import os
import sys
from datetime import date
from dotenv import load_dotenv

load_dotenv()

SEARCH_TOPICS = [
    "Belastingdienst invorderingsbeleid nieuws {jaar}",
    "Invorderingswet 1990 wijzigingen rechtspraak {jaar}",
    "dwangbevel beslaglegging belastingschuld Nederland {jaar}",
    "betalingsregeling belastingschuld Belastingdienst {jaar}",
    "LBIO CJIB deurwaarder belastingen nieuws {jaar}",
    "belastingschulden kwijtschelding minnelijke schikking {jaar}",
    "uitwinning executie belastingdeurwaarder jurisprudentie {jaar}",
    "preferente vordering faillissement belastingdienst {jaar}",
]

SYSTEM_PROMPT = """Je bent een gespecialiseerde nieuwsassistent voor invorderingsspecialisten bij de Nederlandse Belastingdienst.

Je taak is om dagelijks relevante informatie te verzamelen en samen te vatten over:
- Wijzigingen in wet- en regelgeving (Invorderingswet, AWR, AWIR)
- Relevante rechtspraak (belastingkamer rechtbanken, Hoge Raad)
- Beleidswijzigingen bij de Belastingdienst rondom invordering
- Nieuws over betalingsregelingen, beslaglegging, dwangbevelen
- Updates over schuldsanering, faillissementsrecht in relatie tot belastingvorderingen
- Ontwikkelingen bij LBIO, CJIB en gerechtsdeurwaarders
- Politieke ontwikkelingen die invorderingsbeleid raken

Schrijf altijd in het Nederlands. Wees feitelijk, concreet en to-the-point.
Geef voor elk onderwerp de bron (website/instantie) en datum aan waar mogelijk.
Markeer urgente of tijdgevoelige informatie duidelijk.
"""

BRIEFING_PROMPT = """Vandaag is {datum}.

Voer een uitgebreide websearch uit voor een invorderingsspecialist bij de Nederlandse Belastingdienst.
Zoek naar de meest recente en relevante informatie over de volgende onderwerpen:

1. Wet- en regelgeving: recente wijzigingen of aangekondigde wijzigingen in de Invorderingswet 1990, AWR, of aanverwante regelgeving
2. Jurisprudentie: recente uitspraken van rechtbanken en de Hoge Raad over belastinginvordering, beslaglegging, of gerelateerde onderwerpen
3. Belastingdienst beleid: nieuwe beleidsregels, leidraden of interne richtlijnen rondom invordering en betalingsregelingen
4. Schuldsanering & faillissement: relevante ontwikkelingen voor de samenloop met belastingvorderingen
5. Politiek & media: kamervragen, debatten of persberichten die invorderingsbeleid raken
6. Praktijk nieuws: relevante berichten van gerechtsdeurwaarders, LBIO, CJIB of andere ketenpartners

Presenteer de resultaten als een gestructureerde dagelijkse briefing met:
- Een korte samenvatting bovenaan (maximaal 3 bullets met de belangrijkste punten van vandaag)
- Per categorie: concrete bevindingen met bron, datum en VOLLEDIGE URL (bijv. https://www.rechtspraak.nl/...)
- Aan het einde: actiepunten of aandachtspunten voor vandaag

BELANGRIJK: Vermeld bij elke bevinding altijd de volledige URL van de bron zodat deze klikbaar kan worden gemaakt.
Als er weinig actueel nieuws is voor een categorie, vermeld dat dan kort en ga door naar de volgende.
"""


def run_briefing(save: bool = False, output_file: str = None) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("Fout: ANTHROPIC_API_KEY niet gevonden. Stel de omgevingsvariabele in.", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    today = date.today().strftime("%d %B %Y")

    print(f"[{today}] Dagelijkse briefing ophalen voor invorderingsspecialist...\n")
    print("=" * 70)

    full_response = []

    with client.messages.stream(
        model="claude-opus-4-7",
        max_tokens=8000,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        tools=[
            {"type": "web_search_20260209", "name": "web_search"},
        ],
        messages=[
            {
                "role": "user",
                "content": BRIEFING_PROMPT.format(datum=today),
            }
        ],
    ) as stream:
        for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "text_delta":
                    print(event.delta.text, end="", flush=True)
                    full_response.append(event.delta.text)

    print("\n" + "=" * 70)

    report_text = "".join(full_response)

    if save:
        filename = output_file or f"briefing_{date.today().strftime('%Y-%m-%d')}.txt"
        with open(filename, "w", encoding="utf-8") as f:
            f.write(f"DAGELIJKSE BRIEFING INVORDERINGSSPECIALIST\n")
            f.write(f"Datum: {today}\n")
            f.write("=" * 70 + "\n\n")
            f.write(report_text)
            f.write("\n")
        print(f"\nRapport opgeslagen als: {filename}")

    return report_text


def main():
    parser = argparse.ArgumentParser(
        description="Dagelijkse websearch briefing voor invorderingsspecialisten Belastingdienst"
    )
    parser.add_argument(
        "--save",
        action="store_true",
        help="Sla het rapport op als tekstbestand",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Bestandsnaam voor het rapport (standaard: briefing_YYYY-MM-DD.txt)",
    )
    args = parser.parse_args()

    run_briefing(save=args.save, output_file=args.output)


if __name__ == "__main__":
    main()
