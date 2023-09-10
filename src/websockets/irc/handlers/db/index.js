import {MongoClient} from 'mongodb';
const url = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(url)
const bot = client.db('bot');

export default bot;
export let users = bot.collection('users');
export let ludomans = bot.collection('ludomans');
