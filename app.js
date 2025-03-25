// Importa l'API Key dal file config.js
import { API_KEY } from './config.js'

// Navigazione tra sezioni
document.getElementById('start-btn').addEventListener('click', () => {
    const homeSection = document.getElementById('home'); // Sezione home
    const formSection = document.getElementById('form-section'); // Sezione form

    if (homeSection && formSection) {
        homeSection.style.display = 'none'; // Nasconde la sezione home
        formSection.style.display = 'block'; // Mostra la sezione form
    } else {
        console.error('Errore: Sezioni non trovate. Verifica gli ID in HTML.');
    }
});

// Gestione del form
document.getElementById('riot-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const gameName = document.getElementById('gameName').value;
    const tag = document.getElementById('tag').value;
    const rankedOnly = document.getElementById('ranked-only').checked; // Controlla se la casella è spuntata

    document.getElementById('loading').style.display = 'block'; // Mostra il caricamento

    try {
        // Step 1: Ottenere il PUUID
        const puuidUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tag}?api_key=${API_KEY}`;
        const puuidResponse = await fetch(puuidUrl);
        if (!puuidResponse.ok) {
            throw new Error('Errore nel recupero del PUUID: ' + puuidResponse.status);
        }
        const puuidData = await puuidResponse.json();
        const puuid = puuidData.puuid;

        // Step 2: Ottenere i match ID (ultime 30 partite)
        const matchIdUrl = `https://europe.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=30&api_key=${API_KEY}`;
        const matchIdResponse = await fetch(matchIdUrl);
        if (!matchIdResponse.ok) {
            throw new Error('Errore nel recupero dei match ID: ' + matchIdResponse.status);
        }
        const matchIds = await matchIdResponse.json();

        // Step 3: Analizzare i dettagli delle partite
        const matchDetails = [];
        for (const matchId of matchIds) {
            const matchDetailsUrl = `https://europe.api.riotgames.com/tft/match/v1/matches/${matchId}?api_key=${API_KEY}`;
            const matchDetailsResponse = await fetch(matchDetailsUrl);
            if (matchDetailsResponse.ok) {
                const matchData = await matchDetailsResponse.json();

                // Filtra solo i match ranked se la casella è spuntata
                if (!rankedOnly || matchData.info.queue_id === 1100) {
                    matchDetails.push(matchData);
                }
            }
        }

        // Step 4: Mostrare i risultati
        document.getElementById('loading').style.display = 'none'; // Nasconde il caricamento
        document.getElementById('form-section').style.display = 'none'; // Nasconde il form
        displayResults(puuid, matchDetails);

    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        alert(error.message);
    }
});

// Funzione per Mostrare i Risultati
function displayResults(puuid, matches) {
    const resultsSection = document.getElementById('results-section');
    resultsSection.style.display = 'block'; // Mostra la sezione risultati

    // Mostra informazioni dell'utente
    document.getElementById('results').innerHTML = `
        <h3>Account Riot</h3>
        <p>PUUID: ${puuid}</p>
        <h4>Partite analizzate: ${matches.length}</h4>
    `;

    // Analisi delle partite (ultime 30)
    const placements = matches.map(match => {
        const participant = match.info.participants.find(p => p.puuid === puuid);
        return participant ? participant.placement : null;
    }).filter(p => p !== null);

    // Calcolo vittorie e sconfitte
    const wins = placements.filter(pos => pos === 1).length;
    const losses = placements.length - wins;

    // Grafico Radar
    const radarCtx = document.getElementById('radar-chart').getContext('2d');
    new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: ['Attacco', 'Difesa', 'Strategia', 'Velocità', 'Resistenza'],
            datasets: [{
                label: 'Statistiche Giocatore',
                data: [80, 65, 90, 70, 85], // Dati simulati
                backgroundColor: 'rgba(0, 204, 255, 0.2)',
                borderColor: 'rgba(0, 204, 255, 1)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: { beginAtZero: true }
            }
        }
    });

    // Grafico a Torta
    const pieCtx = document.getElementById('pie-chart').getContext('2d');
    new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: ['Vittorie', 'Sconfitte'],
            datasets: [{
                data: [wins, losses],
                backgroundColor: ['#4CAF50', '#FF5722']
            }]
        },
        options: {
            responsive: true
        }
    });
}
