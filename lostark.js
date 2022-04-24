const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
const express = require('express');

const url = 'https://www.playlostark.com/en-us/support/server-status';
const UPDATE_FREQUENCY = 240000;

var serverStatus= [];
var last_check=0;


const getHtml = async url => {
        try {
                const { data } = await axios.get(url);

                return data;
        }
        catch (error) {
        }
};

/*
 * online: 4bc08e ags-ServerStatus-content-responses-response-server-status--good
 * busy: eac04b
 * full: b53434
 * maintenance: 5875b1
 */

const extractServers = $ =>
	$('.ags-ServerStatus-content-responses-response-server')
		.map((_,server) => {
			const $server = $(server);
			return {
				name: $server.find('div:nth-child(2)').contents().first().text().trim(),
				status: $server.find('.ags-ServerStatus-content-responses-response-server-status--maintenance').length>0 ? 'offline' : 'online',
				timestamp: Date.now()
			};
		})
		.toArray();


const checkServerStatus = async (url) => {
	const html = await getHtml(url);
	const $ = cheerio.load(html);
	const servers = extractServers($);

	last_check = Date.now();
	serverStatus = servers;
	console.log("Refreshed data");

	return servers;
};

const checkServerStatusDiff = async (url) => {
	const html = await getHtml(url);
	const $ = cheerio.load(html);
	const servers = extractServers($);

	last_check = Date.now();

	/*
	 *	for each server, check the updated list and compare status
	 *	if the status has changed, notify
	 */

	serverStatus.forEach(lastStatus => { 
		const index = servers.findIndex( newStatus => lastStatus.name.toLowerCase() === newStatus.name.toLowerCase() && lastStatus.status !== newStatus.status)
		if ( index >= 0 ) {
			writeLog("Status changed for ["+ lastStatus.name +"] ["+ lastStatus.status +"] => ["+ servers[index].status +"]")
		} else {
			writeLog("Status unchanged for ["+ lastStatus.name +"] ["+ lastStatus.status +"]")
		}
	});

	serverStatus = servers;	

	writeLog("Refreshed data");

	return servers;
};

function writeLog(message) {
	var time = new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString('en-US', { hour12: false,
                                             hour: "numeric",
                                             minute: "numeric",
					     second: "numeric"});
	console.log(time + " - " + message);
}


/*
 *
 * API SERVER STARTS HERE
 *
 */

const app = express();
const server = http.createServer(app);
const PORT = 3000;

/*
const server = http.createServer((req, res) => {
	console.log("Traffic detected");
	const status_promise = checkServerStatus(url).then(servers => {
		res.writeHead(200, {'Content-Type': 'application/json'});
        	res.end(JSON.stringify({data: (servers)}));
	});
});

server.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
})
*/

/*
app.configure(function() {
	app.set('port', 3000);
	app.use(express.bodyParser());
  	app.use(express.methodOverride());

})
*/
app.get("/", (req,res) => {
	if (Date.now() - last_check > UPDATE_FREQUENCY + 30000) { 
		const status_promise = checkServerStatusDiff(url).then(servers => {
                	res.writeHead(200, {'Content-Type': 'application/json'});
                	res.end(JSON.stringify({data: (servers)}));
        	});
	} 
	else {
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({data: (serverStatus)}));
	}

});

app.get("/:servername", (req,res) => { 
	const status_promise = checkServerStatus(url).then(servers => {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({data: (servers.filter(server => server.name.toLowerCase() === req.params.servername.toLowerCase()))}));
        });
});


app.listen(PORT, () => writeLog("Express server listening on port " + PORT));

setInterval(() => {
	const status_promise = checkServerStatusDiff(url)
},UPDATE_FREQUENCY);
