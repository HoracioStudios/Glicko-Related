const Glicko = require('./modules/Glicko.js');
const MongoJS = require('./modules/mongoJS.js');

const DEBUGLOG = true;

const defaultParameters = {rating: 1500, RD: 350};

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

            let t = Math.random()

            update.push({ result: res, time: t, opponent: rivals[i].id });

            await MongoJS.updatePlayerResults(rivals[i].id, [{ result: Math.abs(1 - res), time: t, opponent: playerID }]);
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

function calculateNewValues(list, player)
{
    var oldRD = player.RD;

    player.RD = Glicko.newRD(player.RD, currentT - player.lastT);

    var rSum = 0;
    var dSum = 0;

    for (let p = 0; p < player.pending.length; p++) {
        const round = player.pending[p];
        
        //si ha habido una partida, ambos integrantes estarán en la lista list: está garantizado
        //empleamos la lista list porque tiene las puntuaciones originales, de forma que el cálculo de puntuaciones se realice somo si todas las partidas se hubieran realizado en el mismo momento
        let rival = list.find(p => p.id == round.opponent);

        if(rival === undefined) rival = defaultParameters;

        //console.log(rival);

        let roundResult = calculateRoundResult(round);

        rSum += Glicko.calculateRSum(player, rival, roundResult);
        dSum += Glicko.calculateDSum(player, rival);
    }

    var values =  Glicko.newPoints(player, rSum, dSum);    

    if(DEBUGLOG)
    {
        console.log(" Old Points: ", player.rating);
        console.log(" Old Deviation: ", oldRD);
        console.log(" New Points: ", values[0]);
        console.log(" New Deviation: ", values[1]);
    }

    return { rating: values[0], RD: values[1], lastT: currentT };
}

async function update() {
    const list = await MongoJS.getPlayersWithPending();

    for (var i = 0; i < list.length; i++) {

        let id = list[i].id;
        
        let player = await MongoJS.wipePlayerPending(id);

        if(player.lastT === undefined) player.lastT = 0;

        if(DEBUGLOG) console.log(`\nUpdating player ${id}`);
        
        if(DEBUGLOG)
        {
            console.log(player.pending);
        }

        var updateValues = calculateNewValues(list, player);

        await MongoJS.updatePlayerRating(id, updateValues);
    }


    await MongoJS.logUpdate();
    currentT++;
}

var currentT = 0;

async function start()
{
    //await importJSONGrossi();

    //await test(1, 2);

    //await update();

    //await MongoJS.logUpdate();

    currentT = await MongoJS.lastT();

    if(currentT === undefined) currentT = 0;

    setInterval(update, 1000);

    //update();
}

start();