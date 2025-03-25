API_KEY = 'RGAPI-7c70ee6c-973b-4ce8-bf5b-73b6db14261c';
const stopLoading =()  => {
    // Nascondi il loader
    document.getElementById('loading-overlay').style.display = 'none';
}
 // Mostra il loader
 const startLoading =()  => {
    document.getElementById('loading-overlay').style.display = 'flex';
}
// Navigazione tra sezioni, scrollto così Betto è contento, ancora più contento
document.getElementById('start-btn').addEventListener('click', () => {
    const formSection = document.getElementById('form-section');

    if (formSection) {
        formSection.style.display = 'block';
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        console.error('Errore: Sezione non trovata. Verifica gli ID in HTML.');
    }
});

// Gestione del form
document.getElementById('riot-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const gameName = document.getElementById('gameName').value.trim();
    const tag = document.getElementById('tag').value.trim();
    const rankedOnly = document.getElementById('ranked-only').checked;

   startLoading()

    try {
        const puuid = await fetchPUUID(gameName, tag);
        const matchDetails = await fetchMatchDetails(puuid, rankedOnly);


        // Nascondi la sezione del form
        document.getElementById('form-section').style.display = 'none';

        // Mostra i risultati
        displayResults(puuid, matchDetails);
    } catch (error) {
      
        alert(error.message);
    }
   stopLoading()
});

// Funzione per ottenere il PUUID
async function fetchPUUID(gameName, tag) {
    try {
        const puuidUrl = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tag}?api_key=${API_KEY}`;
        const response = await fetch(puuidUrl);
        if (!response.ok) {
            throw new Error(`Errore nel recupero del PUUID: ${response.status}`);
        }
        const data = await response.json();
        if (!data?.puuid) {
            throw new Error("PUUID non trovato.");
        }
        return data.puuid;
    } catch (error) {
        throw new Error("Errore durante il recupero del PUUID. Dettagli: " + error.message);
    }
}

// Funzione per ottenere i dettagli delle partite
async function fetchMatchDetails(puuid, rankedOnly) {
    try {
        const matchIdUrl = `https://europe.api.riotgames.com/tft/match/v1/matches/by-puuid/${puuid}/ids?start=0&count=30&api_key=${API_KEY}`;
        const response = await fetch(matchIdUrl);
        if (!response.ok) {
            throw new Error(`Errore nel recupero dei match ID: ${response.status}`);
        }
        const matchIds = await response.json();
        if (!Array.isArray(matchIds)) {
            throw new Error("Impossibile recuperare l'elenco dei match ID.");
        }

        const matchDetails = [];
        for (const matchId of matchIds) {
            const matchDetailsUrl = `https://europe.api.riotgames.com/tft/match/v1/matches/${matchId}?api_key=${API_KEY}`;
            const matchResponse = await fetch(matchDetailsUrl);
            if (matchResponse.ok) {
                const matchData = await matchResponse.json();
                if (matchData?.info && (!rankedOnly || matchData.info.queue_id === 1100)) {
                    matchDetails.push(matchData);
                }
            }
        }
        return matchDetails;
    } catch (error) {
        throw new Error("Errore durante il recupero dei dettagli delle partite. Dettagli: " + error.message);
    }
}
// Funzione per mostrare i risultati
function displayResults(puuid, matches) {
    const statsSection = document.getElementById('stats-section');
    statsSection.style.display = 'block';

    // Mostra le informazioni di base
    document.getElementById('results').innerHTML = `
        <h3>Account Riot</h3>
        <p>PUUID: ${puuid}</p>
        <h4>Partite analizzate: ${matches.length}</h4>
    `;

    // Contatori per campioni e oggetti
    const championCounts = {};
    const itemCounts = {};
    matches.forEach(match => {
        const participants = match?.info?.participants;
        if (Array.isArray(participants)) {
            const participant = participants.find(p => p.puuid === puuid);
            if (participant && Array.isArray(participant.units)) {
                participant.units.forEach(unit => {
                    if (unit.character_id) {
                        championCounts[unit.character_id] = (championCounts[unit.character_id] || 0) + 1;
                    }
                    if (Array.isArray(unit.items)) {
                        unit.items.forEach(item => {
                            itemCounts[item] = (itemCounts[item] || 0) + 1;
                        });
                    }
                });
            }
        }
    });

    const rankProgression = matches
        .map(match => match?.info?.participants?.find(p => p.puuid === puuid)?.placement || null)
        .filter(rank => rank !== null);

    const dates = matches.map(match => {
        const timestamp = match?.info?.game_datetime;
        return timestamp ? new Date(timestamp).toLocaleDateString() : 'Data sconosciuta';
    });

    generateRankProgressionChart(dates, rankProgression);

    // Statistiche Chiave
    const totalGames = matches.length;
    const wins = rankProgression.filter(rank => rank === 1).length;
    const top4 = rankProgression.filter(rank => rank <= 4).length;
    const winRate = ((wins / totalGames) * 100).toFixed(2);
    const top4Rate = ((top4 / totalGames) * 100).toFixed(2);

    document.getElementById('key-stats').innerHTML = `
        <li class="list-group-item"><strong>Partite Totali:</strong> ${totalGames}</li>
        <li class="list-group-item"><strong>Vittorie:</strong> ${wins}</li>
        <li class="list-group-item"><strong>Tasso di Vittoria:</strong> ${winRate}%</li>
        <li class="list-group-item"><strong>Top 4:</strong> ${top4}</li>
        <li class="list-group-item"><strong>Tasso Top 4:</strong> ${top4Rate}%</li>
    `;
}

// Funzione per generare il grafico della progressione del rank
function generateRankProgressionChart(labels, data) {
    const rankCtx = document.getElementById('rank-progress-chart').getContext('2d');
    new Chart(rankCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Progressione',
                data: data,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    reverse: false,
                    beginAtZero: false,
                    ticks: {
                        stepSize: 1,
                        callback: value => `Rank ${value}`
                    }
                }
            }
        }
    });
}
