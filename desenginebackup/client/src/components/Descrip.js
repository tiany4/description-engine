import React from 'react';
import axios from 'axios';
import '../milligram/milligram.min.css';
import DescripComponents from './DescripComponents';
import MongoResync from './MongoResync';

class Descrip extends React.Component {

    updateDescription = text => {
        this.setState({ description: text });
    }

    state = {
        eventdata: '',
        description: '',
        updateDescription: this.updateDescription,
        newEventLoading: false,
        newEventErrorMessage: '',
        newEventId: '',
        eventFromIdErrorMessage: ''
    }

    componentDidMount = () => {
        this.getNewEvent();
    }

    getEventFromId = () => {
        this.setState({ eventFromIdErrorMessage: '' });
        const id = this.state.newEventId;
        if (!id) this.setState({ eventFromIdErrorMessage: 'ID cannot be empty.' });
        else {
            this.getNewEvent();
            this.setState({ newEventId: '' });
        }
    }

    getNewEvent = () => {
        this.setState({ newEventErrorMessage: '' });
        this.setState({ newEventLoading: true });
        // axios.get('/test')
        axios.post('/event', { id: this.state.newEventId ? this.state.newEventId : null }, { timeout: 5000 })
            .then((res) => {
                this.setState({ eventdata: res.data });
                this.setState({ newEventLoading: false });
            })
            .catch((e) => {
                console.error(e);
                console.log(this.state.eventdata)
                this.setState({
                    newEventErrorMessage:
                        e.code === 'ECONNABORTED' ? 'Timed out' : 'Something wrong'
                });
                this.setState({ newEventLoading: false });
            });
    }

    eventLoad = () => {
        if (this.state.eventdata && this.state.eventdata !== 'null') return <this.PrettyPrintJson className="column" />
        else return <h6>Error loading event. Please try refreshing.</h6>
    }

    PrettyPrintJson = () => {
        return (<div><pre><code>{JSON.stringify(this.state.eventdata, null, 2).replace(/\\n*/g, ' ')}</code></pre></div>);
    }

    airtableLink = () => {
        window.open(`https://airtable.com/tblw6XA8PoHI3iMHi/viwxSnHblnD6Dvj46/${this.state.eventdata.id}`);
    }

    eventIdOnChangeHandler = event => {
        this.setState({ newEventId: event.target.value })
    }

    render() {
        return (
            <div className="container" style={{ marginTop: '2%' }}>
                <div className="row">
                    <div className="column column-50">
                        <h3>Raw Event Data</h3>
                        <this.PrettyPrintJson />
                        <div className="row">
                            <button disabled={this.state.newEventLoading} className="column-25 column" onClick={this.getNewEvent}>{this.state.newEventLoading ? 'Loading' : 'New Event'}</button>
                            <button className="column-25 column column-offset-10" onClick={this.airtableLink}>Open In Airtable</button>
                        </div>
                        <p className="column" style={{ 'padding': '7px', 'marginLeft': '5px', 'color': 'red' }}>{this.state.newEventErrorMessage}</p>
                        <br />
                        <div className="form-input">
                            <div className="row">
                                <input
                                    className="column column-25"
                                    type="text"
                                    placeholder="Enter event ID"
                                    value={this.state.newEventId}
                                    onChange={this.eventIdOnChangeHandler}
                                />
                                <br />
                                <button className="reloadButton" disabled={this.state.newEventLoading} onClick={this.getEventFromId}>Get Event</button>
                            </div>
                            <p style={{ 'color': 'red' }}>{this.state.eventFromIdErrorMessage}</p>
                        </div>
                        <MongoResync />
                    </div>
                    <div className="column column-offset-10">
                        <div className="row">
                            {this.state && this.state.eventdata && <DescripComponents flags={JSON.stringify(this.state.eventdata.flags)} eventData={JSON.stringify(this.state.eventdata)} />}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Descrip;