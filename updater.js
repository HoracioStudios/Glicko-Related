const Glicko = require('./modules/Glicko.js');
const MongoJS = require('./modules/mongoJS.js');

const DEBUGLOG = true;

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  } 

async function test(numTests, numMatches) {

    let count = await MongoJS.getUserCount();

    for (let i = 0; i < numTests; i++)
    {
        console.log("------------------");
    
        let playerID = Math.floor(Math.random() * Math.floor(count));

        let player = await MongoJS.findPlayer(playerID);

        //console.log("OriginalPoints: ", player.rating);
        //console.log("OriginalDeviation: ", player.RD);
        
        var totalRivals = await MongoJS.findPlayersInRange(player.rating - (2 * player.RD), player.rating + (2 * player.RD));//Glicko.getPlayersForMatch(playerID, dataFile);
        
        var rivals = Glicko.getRandom(totalRivals, numMatches);
        
        var results = Glicko.generateGames(player, rivals);

        var update = []

        for (let i = 0; i < results.length; i++) {
            let res = results[i];

            update.push({ result: res, time: Math.random(), opponent: rivals[i].id });
        }

        console.log(`Matches by player ${playerID} \n Results: \n ${update}`);

        
        //values = Glicko.newPoints(player, rivals, results);
        //console.log("New Points: ", values[0]);
        //console.log("New Deviation: ", values[1]);

        await MongoJS.updatePlayerResults(playerID, update);
        
        console.log("------------------\n");
    }
}

async function importJSONGrossi() {
    

    let dataFile = require('./players_file.json');
    
    var aux = Object.keys(dataFile);

    for (const key in aux) {
        let player = dataFile[key];
    
        let rat = player["points"];
        let dev = player["deviation"];
    
        await MongoJS.addPlayer(player["id"], {rating: rat, RD: dev}, {nick: "", email: "", password: "", salt: ""});
    }
}

function calculateRoundResult(round) {
    let ret = 0;

    //el resultado de la ronda cuenta como 0.75 de la puntuación
    //el tiempo de la ronda cuenta como 0.25, restándoselo al resultado con tal de que en victorias (1) valga más un tiempo menor, y viceversa
    ret = (0.75 * round.result) + (0.25 * Math.abs(round.result - round.time));

    return ret;
}

async function update() {
    const list = await MongoJS.getPlayerIDsWithPending();

    for (var i = 0; i < list.length; i++) {

        let id = list[i];
        
        let player = await MongoJS.wipePlayerPending(id);

        if(DEBUGLOG) console.log(`\nUpdating player ${id}`);
        
        if(DEBUGLOG)
        {
            console.log(player.pending);
        }

        for (let p = 0; p < player.pending.length; p++) {
            const round = player.pending[p];

            let rival = await MongoJS.findPlayer(round.opponent);

            let roundResult = calculateRoundResult(round);

            values = Glicko.newPoints(player, rival, roundResult);
        }

        if(DEBUGLOG)
        {
            console.log(" Old Points: ", player.rating);
            console.log(" Old Deviation: ", player.RD);
            console.log(" New Points: ", values[0]);
            console.log(" New Deviation: ", values[1]);
        }

        await MongoJS.updatePlayerRating(id, { rating: values[0], RD: values[1] } );
    }
}

async function start()
{
    //await importJSONGrossi();

    //await test(5, 10);

    //await update();

    await MongoJS.logUpdate();
    //setInterval(update, 1000);
}

start();