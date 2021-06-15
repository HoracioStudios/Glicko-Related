const Glicko = require('./modules/Glicko.js');
const MongoJS = require('./MongoJS/mongoJS.js');

const DEBUGLOG = true;

const defaultParameters = Glicko.defaultParameters;

const waitTimeMS = 1000 * 60 * 60; //1 hora

const URI_PATH = './sensitive/uri.uri';
var fs = require('fs');

//URI de sensitive
try
{
    var uri = fs.readFileSync(URI_PATH, 'utf8');
    MongoJS.init(uri);
} catch (error)
{    
    console.log("\nERROR: No se ha encontrado el archivo \'" + URI_PATH + "\', se empleará la conexión por defecto a la base de datos\n");
}

function calculateNewValues(list, player)
{
    var oldRD = player.RD;

    player.RD = Glicko.newRD(player.RD, currentT - player.lastT);

    var rSum = 0;
    var dSum = 0;

    for (let p = 0; p < player.pending.length; p++) {
        var game = player.pending[p];

        var opponent = game.rivalID;

        game.rounds.forEach(round =>
            {
        
            //si ha habido una partida, ambos integrantes estarán en la lista list: está garantizado
            //empleamos la lista list porque tiene las puntuaciones originales, de forma que el cálculo de puntuaciones se realice somo si todas las partidas se hubieran realizado en el mismo momento
            let rival = list.find(p => p.id == opponent);
    
            if(rival === undefined) rival = defaultParameters;
    
            rSum += Glicko.calculateRSum(player, rival, round.result);
            dSum += Glicko.calculateDSum(player, rival);

        });
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
        
        let player = await MongoJS.wipePlayerPending(id, currentT);

        if(player.lastT === undefined || player.lastT < 0) player.lastT = currentT;

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

    currentT = await MongoJS.lastT();

    if(currentT === undefined) currentT = 0;

    setInterval(update, waitTimeMS);
}

start();