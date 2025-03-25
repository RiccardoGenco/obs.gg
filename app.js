API_KEY = 'RGAPI-e35dc902-dc2d-4400-94d4-d0e6bc920492';

// Navigazione tra sezioni
document.getElementById('start-btn').addEventListener('click', () => {
    const homeSection = document.getElementById('home');
    const formSection = document.getElementById('form-section');

    if (homeSection && formSection) {
        homeSection.style.display = 'none';
        formSection.style.display = 'block';
    } else {
        console.error('Errore: Sezioni non trovate. Verifica gli ID in HTML.');
    }
});

// Gestione del form
document.getElementById('riot-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const gameName = document.getElementById('gameName').value.trim();
    const tag = document.getElementById('tag').value.trim();
    const rankedOnly = document.getElementById('ranked-only').checked;

    document.getElementById('loading').style.display = 'block';

    try {
        const puuid = await fetchPUUID(gameName, tag);
        const matchDetails = await fetchMatchDetails(puuid, rankedOnly);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('form-section').style.display = 'none';
        displayResults(puuid, matchDetails);
    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        alert(error.message);
    }
});

// Funzione per ottenere il PUUID
async function fetchPUUID(gameName, tag) {
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
}

// Funzione per ottenere i dettagli delle partite
async function fetchMatchDetails(puuid, rankedOnly) {
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
                label: 'Progressione Rank',
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
                    reverse: true,
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
