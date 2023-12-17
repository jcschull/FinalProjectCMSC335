const http = require("http");
const path = require("path");
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const portNumber = 7002;
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') }) 
const user = process.env.MONGO_DB_USERNAME;
const pass = process.env.MONGO_DB_PASSWORD;
const database = process.env.MONGO_DB_NAME; 
const recents = process.env.MONGO_COLLECTION;
const favorites = process.env.MONGO_FAVORITES_COLLECTION
const uri = `mongodb+srv://${user}:${pass}@finalprojectcluster.llbyeqs.mongodb.net/?retryWrites=true&w=majority`;
const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});

/* directory where templates will reside */
app.set("views", path.resolve(__dirname, "htmls"));

/* view/templating engine */
app.set("view engine", "ejs");

const client_id = 'a4b7d59c1cfd42acb2f6b925f8d981da';
const client_secret = '4ad6e84597fb444db9732cfd9582ff99';

app.listen(portNumber, (err) => {
    if (err) {
      console.log("Starting server failed.");
    } else {
      console.log(`Web Server Started and Running at http://localhost:${portNumber}`);
      process.stdout.write("Stop to shutdown the server: ");
    }
});

let reader = function() {
    let dataInput = process.stdin.read();
	if (dataInput !== null) {
		let command = (String(dataInput).trim()).toLowerCase();

		if (command === "stop") {
			console.log("Shutting down the server");
            process.exit(0);  /* exiting */
        } else {
			console.log(`Invalid command: ${command}`);
            process.stdout.write("Stop to shutdown the server: ");
            reader()
		}
    }
}

process.stdin.on('readable', reader);

/**
 * FIXME: Change to the directory of the html templates
 * FIXME: Change link to match hosting URL
 */
app.get("/", (req, res) => {
    res.render("search.ejs", {formTag: `<form action=\"http://localhost:${portNumber}/results\" method="post">`}); // Change link to match hosting URL
});

app.use(bodyParser.urlencoded({extended:false}))
/**
 * FIXME: Change to correct results .ejs file
 */
app.post(`/results`, async (req, res) => {
    const { query } = req.body;
    let token = await getToken();
    let searchJSON = await getSearch(query, token.access_token);
    let results = processSearch(searchJSON);

    //add results[0] here
    let findArtist = {
      query: results[0]
    }

    await insertArtist(findArtist)
    //await getFavorite(findArtist)

    res.render("ResultsPage", results[0]); // Change to correct results .ejs file
});

async function insertArtist(artist){
  try {
      await client.connect();
     
      /* Inserting */
      await client.db(database).collection(recents).insertOne(artist);  
  } catch (e) {
      console.error(e);
  } finally {
      await client.close();
  }
}

/**
 * Takes in json result of getSearch and outputs tuple:
 * (name, genres, followers, images list, Spotify Page)
 * 
 * FIXME: Note: These are stored as html tags to be rendered.
 * 
 * @param {json} searchResults 
 */
function processSearch(searchResults){
  /*
  Artist Object Path
  artists -> items
  for each item: (name; genres; images[url, height, width]; external_urls -> spotify)
  */
  let output = [];
  let artistList = searchResults.artists.items;

  artistList.forEach((elem) => {
      let currVar = {};
      let genres = elem.genres;
      let genreshtml = "";

      genres.forEach((e) => {
          genreshtml += `<br><input type=\"text\" id=\"genres\" value=\"${e}\" size=\"15\">`;
      });
      
      currVar.name = `<input type=\"text\" id=\"name\" value=\"${elem.name}\">`;
      currVar.genres = genreshtml;
      currVar.followers = `<input type=\"text\" id=\"followers\" value=\"${elem.followers.total}\">`;
      if(elem.images[0] == null){
          currVar.image = "<h2>NO IMAGE AVAILABLE, BLAME SPOTIFY</h2>";
      } else{
          currVar.image = `<img id=\"image\" src=\"${elem.images[0].url}\" alt="Image Error"></img>`;
      }
      currVar.spotify = `<a href=\"${elem.external_urls.spotify}\" target=\"_blank\">Artist Page</a>`;

      output.push(currVar);
  });

  return output
}

/**
 * Receives search string and returns json from Spotify results.
 * 
 * @param {String} query 
 * @param {String} access_token 
 * @returns 
 */
async function getSearch(query, access_token) {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=artist&market=US`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + access_token },
    });

    return await response.json();
}

/**
 * Use whenever we need a token for the API.
 * 
 * @returns access_token
 */
async function getToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
      },
    });
  
    return await response.json();
}

async function getFavorite(artist) {
    try {
        await client.connect();
        //artist = document.getElementById("fav");
        result = await client.db(database).collection(recents).findOne(artist);
        await client.db(database).collection(favorites).insertOne(artist);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}