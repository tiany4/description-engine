import React, { Component } from 'react';
import axios from 'axios';
import '../milligram/milligram.min.css';
import { sortableContainer, sortableElement } from 'react-sortable-hoc';
import DescriptionEditor from './DescriptionEditor';
import arrayMove from 'array-move';

const SortableItem = sortableElement(({ value, reload }) => {
    const flagType = `${value.component_flag.type}/${value.component_flag.flag}`.replace('/null', '');
    const color = () => {
        switch (value.component_flag.type) {
            case 'event_type':
                return '#de91e2';
            case 'primary':
                return '#fcfba9';
            case 'ecosystem':
                return '#00bdf9';
            case 'generic':
                return '#00f5d4';
            default:
        }
    }

    return (
        <div className="row">
            <li className="column column-70 noselect componentlabel" style={{ 'marginBottom': '2px' }}>
                <p style={{ 'color': color() }}>Flag: {flagType}</p>{value.component_content}
            </li>
            <button className="reloadButton" onClick={reload}>Reload</button>
        </div>
    )
});

const SortableContainer = sortableContainer(({ children }) => {
    return <ul>{children}</ul>;
});

export default class DescripComponents extends Component {

    constructor(props) {
        super(props);
        this.state = {
            flags: this.props.flags,
            description: '',
            items: null
        };
        this.textboxRef = React.createRef();
    }

    componentDidMount = () => {
        this.getComponents();
    }

    componentDidUpdate = (prevProps) => {
        if (this.props.flags !== prevProps.flags) this.getComponents();
    }

    getComponents = () => {
        const data = {
            flags: JSON.parse(this.props.flags),
            virtual: JSON.parse(this.props.eventData).virtual_rule
        }
        axios({
            method: 'post',
            url: '/components',
            data: data,
            json: true
        }).then((res) => {
            this.setState({ items: res.data });
            this.setState({ description: this.joinComponents() });
        }).catch((err) => console.error(err));
    }

    joinComponents = () => {
        let componentContentArray = [];
        for (let i = 0; i < this.state.items.length; i++) {
            componentContentArray.push(this.state.items[i].component_content.trim());
        }
        return componentContentArray.join(' ');
    }

    onSortEnd = ({ oldIndex, newIndex }) => {
        this.setState(({ items }) => ({
            items: arrayMove(items, oldIndex, newIndex),
        }));
        this.setState({ description: this.joinComponents() });
    };

    shuffle = () => {
        let array = this.state.items;
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

        this.setState({ items: array });
        this.setState({ description: this.joinComponents() });
    }

    changeText = () => {
        if (this.textboxRef.current) this.textboxRef.current.changeText(this.state.description.replace(/#EVENTTITLE/g, JSON.parse(this.props.eventData).event_name));
    }

    reloadComponent = (oldComponent) => {
        let items = this.state.items;
        axios({
            method: 'post',
            url: '/onecomponent',
            data: oldComponent,
            json: true
        }).then((res) => {
            items[this.state.items.indexOf(oldComponent)] = res.data;
            this.setState({ items: items });
            this.setState({ description: this.joinComponents() });
        }).catch((err) => console.error(err));
    }

    render() {
        let compList;
        if (this.state.items) {
            compList =
                <SortableContainer className="column-50" onSortEnd={this.onSortEnd} lockAxis='y' lockToContainerEdges={true}>
                    {this.state.items.map((value, index) => (
                        <SortableItem key={`item-${value._id}`} index={index} value={value} reload={() => this.reloadComponent(value)} />
                    ))}
                </SortableContainer>
        } else {
            compList = <p>Loading...</p>
        }

        return (
            <div>
                <h3>Description Components</h3>
                {compList}
                <div className="row">
                    <button className="column-25" onClick={this.getComponents}>Reload All Comp</button>
                    <button className="column-25" style={{ 'marginLeft': '2rem' }} onClick={this.shuffle}>Randomize Items</button>
                    <button onClick={this.changeText} className="column-25" style={{ 'marginLeft': '2rem' }}>
                        Send To Textbox
                    </button>
                </div>
                <div className="row" style={{ marginTop: '5rem' }}>
                    <DescriptionEditor ref={this.textboxRef} eventId={JSON.parse(this.props.eventData).id} flags={JSON.stringify(this.state.items)} />
                </div>
            </div>
        );
    }
}