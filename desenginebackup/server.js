const express = require('express');
const morgan = require('morgan');
const { uploadComps } = require('./util/uploadComps');
const app = express();
const PORT = process.env.PORT || 8080;

const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const mongoConnection = async() => {
    const mongoSrv = process.env.MONGODB_URI || 'mongodb+srv://xxx:xxx@description.b10c0.mongodb.net/test';
    return (await MongoClient.connect(mongoSrv, { useUnifiedTopology: true }));
}

const airtable = require('airtable');
airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'xxx'
});

app.use(morgan('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === 'production') app.use(express.static('client/build'));

app.post('/auth', async(req, res) => {
    const connection = await mongoConnection();
    const db = connection.db('description');
    this.writersCollection = db.collection('writers');
    const writer = await this.writersCollection.findOne({ key: req.body.key });
    if (writer) {
        delete writer.key;
        res.status(200).json({
            success: true,
            writer: writer
        });
    } else {
        res.json({
            statusCode: 403,
            message: 'Internal Server Error'
        });
    }
    await connection.close();
});

app.post('/event', async(req, res) => {
    let event;
    while (!event) {
        try {
            event = await getNewEvent(req.body.id);
            if (event) {
                // console.log(event)
                event.success = true;
                event = await processFlags(event);
                res.status(200).json(event);
            } else {
                res.status(404).json({ success: false })
            }
            return;
        } catch (e) {
            console.error(e);
            res.status(502).json(e);
            return;
        }
    }
});

app.post('/components', async(req, res) => {
    try {
        const connection = await mongoConnection();
        const db = connection.db('description');
        const componentsCollection = db.collection('components');
        let finalresults = [];

        // search flags for fitting components
        for await (let flag of req.body.flags) {
            const result = await componentsCollection.aggregate([{
                    $match: {
                        $and: [
                            { 'component_flag.type': flag.flag_type }, { 'component_flag.flag': flag.flag_name }
                        ]
                    }
                },
                { $sample: { size: 1 } }
            ]).toArray();
            if (result.length > 0) finalresults.push(result[0]);
        }

        // add generics to the results
        const genericConnector = await componentsCollection.aggregate([{
                $match: {
                    $and: [
                        { 'component_flag.type': 'generic' }, { 'component_flag.flag': 'connector' }
                    ]
                }
            },
            {
                $sample: { size: 1 }
            }
        ]).toArray();

        finalresults.push(genericConnector[0]);

        const genericEventTitle = await componentsCollection.aggregate([{
                $match: {
                    $and: [
                        { 'component_flag.type': 'generic' }, { 'component_flag.flag': 'event_title' }
                    ]
                }
            },
            {
                $sample: { size: 1 }
            }
        ]).toArray();

        finalresults.push(genericEventTitle[0]);

        if (req.body.virtual) {
            let flag;
            if (req.body.virtual === '100% Virtual') flag = 'virtual_full';
            else if (req.body.virtual === 'Virtual and In Person') flag = 'virtual_partial';

            if (flag) {
                const virtualComponent = await componentsCollection.aggregate([{
                        $match: {
                            $and: [
                                { 'component_flag.type': 'virtual' }, { 'component_flag.flag': flag }
                            ]
                        }
                    },
                    {
                        $sample: { size: 1 }
                    }
                ]).toArray();

                finalresults.push(virtualComponent[0]);
            }
        }

        await connection.close();
        // console.log(finalresults)
        res.status(200).json(finalresults);
        return;
    } catch (error) {
        console.error(error);
        return;
    }
});

app.post('/onecomponent', async(req, res) => {
    const connection = await mongoConnection();
    const db = connection.db('description');
    const componentsCollection = db.collection('components');

    const oldComponent = req.body;

    const result = await componentsCollection.aggregate([{
            $match: {
                $and: [
                    { 'component_flag.type': oldComponent.component_flag.type },
                    { 'component_flag.flag': oldComponent.component_flag.flag },
                    { _id: { $not: { $eq: ObjectId(oldComponent._id) } } }
                ],
                // $not: [{ _id: ObjectId(oldComponent._id) }]
            }
        },
        {
            $sample: { size: 1 }
        }
    ]).toArray();

    await connection.close();

    if (result && result.length > 0)
        res.status(200).json(result[0]);
    else res.status(502);
});

app.post('/submitdescription', async(req, res) => {
    try {
        // submit to airtable
        const response = await base('events').update([{
            "id": req.body.eventId,
            "fields": {
                "description": req.body.description
            }
        }]);

        // add usage count to mongo
        const connection = await mongoConnection();
        const db = connection.db('description');
        const componentsCollection = db.collection('components');
        for await (let flag of JSON.parse(req.body.flags)) {
            flag.times_used++;
            await componentsCollection.updateOne({ _id: ObjectId(flag._id) }, { $set: { times_used: flag.times_used } }, { upsert: false });
        }

        await connection.close();

        res.status(200).json(response._rawJson);
    } catch (error) {
        console.error(error)
        res.status(502).json(error);
    }
})

app.get('/resync', async(req, res) => {
    const connection = await mongoConnection();
    const db = connection.db('description');
    const componentsCollection = db.collection('components');

    // write current components to backup collection
    const date = new Date().toISOString();
    try {
        await componentsCollection.aggregate([{
                $match: {}
            },
            {
                $out: `backup_components_${date}`
            }
        ]).toArray();

        await componentsCollection.drop();
        await connection.close();

        // upload new list of components
        await uploadComps();
        res.status(200).json({ success: true });
        return;
    } catch (error) {
        console.log(error)
        res.status(502).json({ success: false });
    }
})

app.get('/test', async(req, res) => {
    res.status(200).json({
        event_name: 'EVO Championship Series 2020',
        original_description: 'The Evolution Championship Series (Evo for short) represents the largest and longest-running fighting game tournaments in the world. Evo brings together the best of the best from around the world in a dazzling exhibition of skill and fun, as players and fans gather to honor the competitive spirit in an open format and determine a champion. Our tournaments are about more than just winning. Evo is open to anyone, feature stations available for relaxed free play, and offer unique opportunities to meet people from different countries and different walks of life who share your passion. Established champions face off against unknown newcomers, and new rivals that might have only talked or fought online meet up and become old friends.',
        start_date: '7/31/2020',
        end_date: '8/2/2020',
        id: 'recqyyfJAWdrDwZRg',
        venue: {
            name: 'Mandalay Bay Casino and Resort',
            address: '3950 S Las Vegas Blvd',
            city: 'Las Vegas',
            state: 'NV',
            postcode: '89119'
        },
        flags: [{
                flag_name: 'competition',
                flag_type: 'event_type'
            },
            {
                flag_name: 'e_sports',
                flag_type: 'primary'
            },
            {
                flag_name: 'vendors',
                flag_type: 'ecosystem'
            },
            {
                flag_name: 'ceremony',
                flag_type: 'ecosystem'
            }
        ]
    });
});

app.listen(PORT, console.log(`Listening on ${PORT}`));

const shuffle = (array) => {
    let currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

const getNewEvent = async(id) => {
    if (!id) {
        const records = await (await base('events').select({
            filterByFormula: `AND(NOT({event_type} = ''), NOT({ecosystem_descriptors} = ''), {description} = '')`,
            pageSize: 10,
            sort: [{ field: "start_date" }],
            view: 'Unflagged_filter'
        })).firstPage();
        if (records.length > 0) {
            return shuffle(records)[0]._rawJson.fields;
        }
    } else {
        const record = await base('events').find(id);
        if (record) return record._rawJson.fields;
    }
};

const processFlags = async(event) => {
    let primary_descriptors = [];
    // check if there is any primary descriptor flags
    // if so, push into array for later use
    Object.keys(event).forEach(key => {
        if (key.includes('primary_descriptor')) {
            primary_descriptors.push(key);
        }
    });

    // process record

    // declare final array of flags
    event.flags = [];

    // retrieve venue and flag info from respective tables
    // venue
    if (event.venue_name) {
        base('venues').find(event.venue_name[0], (err, record) => {
            if (err) { console.error(err); return; } else {
                let venue = record._rawJson.fields;
                delete venue.country;
                delete venue.events;
                delete venue.question_venue;
                event.venue = venue;
            }
        });
    }

    // flag
    // primary flags is complicated because we need to loop through all columns and then all flags
    for await (let descriptor_category of primary_descriptors) {
        for await (let descriptorId of event[descriptor_category]) {
            const record = await base('descriptors_primary').find(descriptorId);
            event.flags.push({
                flag_name: record.fields.Name,
                flag_type: 'primary'
            });
        }
    }

    // ecosystem flags
    for await (let descriptorId of event.ecosystem_descriptors) {
        const record = await base('descriptors_ecosystem').find(descriptorId);
        event.flags.push({
            flag_name: record.fields.Name,
            flag_type: 'ecosystem'
        });
    }

    // event_type flag
    event.flags.push({
        flag_name: event.event_type,
        flag_type: 'event_type'
    });

    // delete unnecessary fields
    delete event.source_url;
    delete event.venue_name;
    delete event.start_date;
    delete event.end_date;
    delete event.event_type;
    delete event.ecosystem_descriptors;
    primary_descriptors.forEach(field_name => delete event[field_name]);
    // console.log(util.inspect(event, false, null));

    return event;

};