import React, { Component } from 'react';
import axios from 'axios';

export default class DescriptionEditor extends Component {

    constructor(props) {
        super(props);
        this.state = {
            description: this.props.description,
            submitting: false,
            message: ''
        };
        this.onChangeHandler = this.onChangeHandler.bind(this);
        this.textRef = React.createRef();
    }

    Submit = (event) => {
        this.setState({ submitting: true });
        event.preventDefault();
        this.setState({ message: '' });

        axios.post('/submitdescription', {
            description: this.state.description,
            eventId: this.props.eventId,
            flags: this.props.flags
        }, {
            timeout: 5000
        }).then((res) => {
            if (res.data.id) this.setState({ message: 'Submission Successful' });
            this.setState({ submitting: false });
            this.setState({ description: '' });
            window.location.reload(false);
        }).catch((e) => {
            console.error(e);
            this.setState({ submitting: false });
            this.setState({
                message:
                    e.code === 'ECONNABORTED' ? 'Timed out' : 'Something wrong'
            });
        });
    };

    changeText = (text) => {
        this.setState({ description: text });
    }

    onChangeHandler = (event) => {
        this.setState({ description: event.target.value })
    }

    render() {
        return (
            <form onSubmit={this.Submit}>
                <textarea
                    cols={48}
                    value={this.state.description}
                    onInput={this.onChangeHandler}
                    ref={this.textRef}
                />
                <button type="submit" className="column column-25" disabled={this.state.submitting}>{this.state.submitting ? 'Submitting' : 'Submit'}</button>
                <p className="column" style={{ 'padding': '7px', 'marginLeft': '5px', 'color': 'red' }}>{this.state.message}</p>
            </form>
        )
    }
}
