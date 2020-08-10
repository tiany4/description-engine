import React from 'react';
import axios from 'axios';
import FadeIn from 'react-fade-in';

import Descrip from './components/Descrip';
import ErrorBoundary from './components/ErrorBoundary'

import logo from './images/og_logo.svg';
import bg from './images/og_bg.png';
import './milligram/milligram.min.css';

class App extends React.Component {

	state = {
		key: '',
		message: '',
		submitting: false,
		// auth: false,
		// writer: null
		auth: true,
		writer: {
			"_id": "5ed51c674498ab24fc642397",
			"name": "yuchen",
			"descriptions_written": 0
		}
	};

	componentDidMount() {
		document.body.style.backgroundColor = '#343a40'
		document.body.style.backgroundSize = 'cover';
		document.body.style.backgroundRepeat = 'no-repeat';
		document.body.style.backgroundImage = `url(${bg})`;
	}

	onChangeHandler = (event) => {
		this.setState({ key: event.target.value })
	};

	authSubmit = async (event) => {
		this.setState({ submitting: true });
		event.preventDefault();
		this.setState({ message: '' });

		try {
			const res = await axios.post('/auth', {
				key: this.state.key
			});
			if (res.data.success) {
				// key verified
				this.setState({ auth: true });
				this.setState({ writer: res.data.writer });
			} else {
				this.setState({ message: 'Incorrect key' });
				this.setState({ submitting: false });
			}
		} catch (error) {
			console.error(error);
		}
	};

	render() {
		if (!this.state.auth) {
			return (
				<section className="container" style={{ marginTop: '17%' }}>
					<div className="row">
						<div className="column column-50 column-offset-25">
							<FadeIn>
								<img src={logo} alt="" />
								<br />
								<form onSubmit={this.authSubmit}>
									<div className="form-input">
										<div className="row">
											<input
												type="text"
												// name="title"
												placeholder="Enter your key"
												value={this.state.key}
												onChange={this.onChangeHandler}
											/>
											<br /><br />
										</div>
										<div className="row">
											<button className="column column-25" disabled={this.state.submitting}>Submit</button>
											<p className="column" style={{ 'padding': '7px', 'marginLeft': '5px', 'color': 'red' }}>{this.state.message}</p>
										</div>
									</div>
								</form>
							</FadeIn>
						</div>
					</div>
				</section>
			);
		} else {
			return (
				<div>
					<ErrorBoundary>
						<FadeIn>
							<Descrip writer={this.state.writer} />
						</FadeIn>
					</ErrorBoundary>
				</div>
			)
		}
	}
}

export default App;
