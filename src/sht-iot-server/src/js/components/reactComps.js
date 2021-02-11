import { URLName, sortTimers } from './helperFunctions';
import { HomeTab } from './homeComponents.js'
import { DeviceTab } from './deviceComponents.js'
import socketIOClient from 'socket.io-client';

class Site extends React.Component {
    constructor(props) {
        super(props);
        //this.handlePageChange = this.handlePageChange.bind(this)

        const socket = socketIOClient(location.host); //connect to socket.io on the same domain and port

        socket.on('devicesUpdate', (devices) => {
            devices.forEach((device) => {
                if (device.timers instanceof Array) {
                    device.timers = sortTimers(device.timers);
                }
            });

            this.setState({
                devices: devices
            });
        });
        this.state = {
            activePage: "Home",
            devices: [],
            socket: socket
        };
    }

    componentDidMount() {
        //this.connectSocket();
    }

    render() {
        var tabNames = [{ name: 'Home', id: '0' }]
        const deviceTabs = this.state.devices.map((device) => {
            tabNames.push({ name: device.name, id: device.id + 1 });
            return <DeviceTab key={device.id} device={device} socket={this.state.socket}/>;
        });

        return (
            <div className="wrapper">
                <NavBar tabs={tabNames} activePage={this.state.activePage} />
                <div className="tab-content">
                    <HomeTab devices={this.state.devices}/>
                    {deviceTabs}
                </div>
            </div>
        );
    }
}

class NavBar extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        var itemList = this.props.tabs.map((tab) => {
            return <NavItem key={tab.id} name={tab.name} activePage={this.props.activePage} />
        });
        return (
            <div className="navbar navbar-expand-lg bg-info">
                <div className="container">
                    <a className="navbar-brand" id={'logo-tab'} href="#Home" role="tab"
                        data-toggle="tab" aria-controls="Home" aria-selected="true">
                        Shtainberg IoT
                    </a>
                    <div className="collapse navbar-collapse">
                        <ul className="nav nav-tabs navbar-nav" id="myTab" role="tablist">
                            {itemList}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }
}

class NavItem extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        var name = this.props.name;
        var urlName = URLName(name);
        var selected = "false";
        if (this.props.activePage == name) {
            selected = "true";
        }
        return (
            <li className={"nav-item"}>
                <a className="nav-link" id={urlName + '-tab'} role="tab" data-toggle="tab"
                    href={'#' + urlName} aria-controls={urlName} aria-selected={selected}>
                    {name}
                </a>
            </li>
        )
    }
}

//render
ReactDOM.render(<Site/>, document.getElementById('root'));

export default Site;