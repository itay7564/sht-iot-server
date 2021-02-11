import { URLName, hourMinute, formatTimer, getColor } from './helperFunctions';
import { TimersCard } from './timerComponents'


export class DeviceTab extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        var device = this.props.device;
        var urlName = URLName(device.name);
        return (
            <div className="tab-pane" id={urlName} role="tabpanel" aria-labelledby={urlName + "-tab " + urlName + "-homeButton"}>
                <div className="row mb-1">
                    <div className="col-md-12 text-center">
                        <h1>{device.name}</h1>
                        <h1 className={"text-" + getColor(device.stateColor)} > { device.state }</h1>
                    </div>
                </div>
                <div className="container-fluid">
                    <ButtonsCard device={device} socket={this.props.socket}/>
                    <TimersCard device={device} socket={this.props.socket}/>
                </div>
            </div>
        );
    }
}


class ButtonsCard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            disabled: false
        };
    }

    handleButtonPress(id) {
        this.setState({ disabled: true }); //avoid adding the same timer multiple times
        setTimeout(() => { this.setState({ disabled: false }) }, 1000);//After 1 second, re-enable the button
        const socket = this.props.socket;
        socket.emit('deviceAction', this.props.device.id, 'buttonPress', { id: id });
    }

    render() {
        var device = this.props.device;
        if (device.buttons === undefined || device.buttons.length == 0) {
            return null; //no buttons
        }//else there are buttons
        let buttonList = device.buttons.map((button) => {
            return (
                <button key={button.id} onClick={() => { this.handleButtonPress(button.id) }} disabled={this.state.disabled}
                    className={"btn btn-round btn-md mx-auto mb-4 d-block btn-" + getColor(button.color)}>
                    <h3>{button.name}</h3>
                </button>
            );
        });
        return (
            <div className="card mx-auto mb-4 d-block">
                <div className="card-header">
                    <h3 className="card-title">Buttons</h3>
                </div>

                <div className="card-body">
                    {buttonList}
                </div>
            </div>
        );
    }
}