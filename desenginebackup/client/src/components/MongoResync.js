import React, { Component } from 'react';
import '../milligram/milligram.min.css';
import axios from 'axios';

export default class MongoResync extends Component {

    state = {
        passphrase: '',
        submitted: false,
        errorMessage: ''
    }

    onChangeHandler = event => {
        this.setState({ passphrase: event.target.value });
    }

    resyncdb = () => {
        this.setState({ submitted: true });
        if (this.state.passphrase !== 'supersecretpassphrase') {
            this.setState({ errorMessage: 'Wrong passphrase', submitted: false, passphrase: '' });
        } else {
            axios({
                method: 'get',
                url: '/resync'
            }).then(() => {
                this.setState({ submitted: false, passphrase: '' });
                window.location.reload();
            }).catch((err) => console.error(err));
        }
    }

    render() {
        return (
            <div>
                <div className="form-input">
                    <div className="row">
                        <input
                            className="column column-25"
                            type="text"
                            placeholder="Enter passphrase"
                            value={this.state.passphrase}
                            onChange={this.onChangeHandler}
                        />
                        <button className="reloadButton" disabled={this.state.submitted} onClick={this.resyncdb}>Resync Comps DB</button>
                    </div>
                    <p style={{ 'color': 'red' }}>{this.state.errorMessage}</p>
                </div>
            </div>
        )
    }
}
