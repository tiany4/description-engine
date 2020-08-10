const Airtable = require('airtable');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const MongoClient = require('mongodb').MongoClient;

Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'xxx'
});
const base = Airtable.base('xxx');

async function getRecords(tableName) {
    let allRecords = [];
    await base(tableName).select({

    }).eachPage(async function page(records, fetchNextPage) {
        records.forEach(async record => {
            allRecords.push(record._rawJson.fields);
            await sleep(100);
        });

        fetchNextPage();
    });
    console.log(`Grabbed ${allRecords.length} records`);
    return allRecords;
}
async function processCompsAndPush(flag_type) {
    let records = await getRecords(flag_type);
    for await (let record of records) {
        let flag = record[flag_type];
        delete record[flag_type];
        let componentsToPush = [];

        for (let key of Object.keys(record)) {

            componentsToPush.push({
                component_content: record[key].replace(/\n/g, ''),
                times_used: 0,
                component_flag: {
                    type: flag_type,
                    flag: flag.toLowerCase().replace(/\s/g, '_')
                }
            });

        }
        try {
            if (componentsToPush.length > 0) await componentsCollection.insertMany(componentsToPush);
        } catch (error) {
            console.log(componentsToPush)
        }
    }
}

async function uploadComponents() {
    let mongoConnection = await MongoClient.connect('mongodb+srv://xxx:xxx@description.b10c0.mongodb.net/test', { useUnifiedTopology: true });
    const db = mongoConnection.db('description');
    this.componentsCollection = db.collection('components');

    await processCompsAndPush('event_type');
    await processCompsAndPush('primary');
    await processCompsAndPush('ecosystem');
    await processCompsAndPush('generic');
    await processCompsAndPush('virtual');
    await mongoConnection.close();
}

module.exports = {
    uploadComps: async function() {
        await uploadComponents();
    }
}
