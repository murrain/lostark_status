const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
const express = require('express');

const url = 'https://www.playlostark.com/en-us/support/server-status';
var serverStatus = [];
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
	if (Date.now() - last_check > 300000) { 
		const status_promise = checkServerStatus(url).then(servers => {
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
	
app.listen(PORT, () => console.log("Express server listening on port " + PORT));
