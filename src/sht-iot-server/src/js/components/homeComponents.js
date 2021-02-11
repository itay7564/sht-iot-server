import { URLName, getColor } from './helperFunctions';

export class HomeTab extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const buttonList = this.props.devices.map((device) => {
            var color = getColor(device.stateColor);
            var urlName = URLName(device.name);
            return (
                <button type="button" key={device.id} href={"#" + urlName} role="tab" id={urlName + '-homeButton'} data-toggle="tab" aria-controls={urlName} aria-selected={"false"}
                        className={"btn nav-link btn-md btn-round mx-auto mb-4 d-block btn-" + color}>
                        <h2>{device.name}</h2>
                </button>
            );
        });
        return (
            <div className="tab-pane active" id="Home" role="tabpanel" aria-labelledby="Home-tab" >
                <div className="text-center">
                    <h3>Welcome to Shtainberg IoT!</h3>
                    <h4>Choose device:</h4>
                </div>
                <div className="text-center">
                    {buttonList}
                </div>
            </div>
        );
    }
}

