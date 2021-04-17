import { URLName, hourMinute, formatTimer, getColor, numberInRange, sortTimers } from './helperFunctions';
import { Doughnut } from 'react-chartjs-2';

export class TimersCard extends React.Component {
    constructor(props) {
        super(props);
        this.handleSelectTimer = this.handleSelectTimer.bind(this);
        this.handleTimerPreview = this.handleTimerPreview.bind(this);
        this.handleHideAlert = this.handleHideAlert.bind(this);
        this.handleShowAlert = this.handleShowAlert.bind(this);
        this.state = {
            timers: this.props.device.timers,
            showAlert: false,
            previewTimer: null,
            selectedTimer: null
        };
    }

    handleSelectTimer(id) {
        this.setState({
            selectedTimer: id
        });
    }

    handleTimerPreview(timer) {
        if (timer.eh === -1 || timer.sh === -1) {
            this.setState({
                previewTimer: null //Do not display preview timer
            });
        }
        else {
            this.setState({
                previewTimer: timer
            });
        }
    }

    handleHideAlert() {
        this.setState({ showAlert: false });
    }

    handleShowAlert() {
        this.setState({ showAlert: true });
    }

    render() {
        let device = this.props.device;
        if (device.allowTimers == false || device.timers == null) {
            return null; //no timers allowed, do not render
        }
        let timers = device.timers;
        
        //timer table componnents
        let tableAddTimerRow = <AddTimerRow timers={timers} selected={this.state.selectedTimer} socket={this.props.socket}
            handleTimerPreview={this.handleTimerPreview} handleShowAlert={this.handleShowAlert} deviceID={device.id} />;
        let tableTimerRows = timers.map((timer) => {
            return <TimerRow timer={timer} socket={this.props.socket} deviceID={device.id} selected={this.state.selectedTimer} key={timer.id} />
        });

        
        return (
            <div className="card mx-auto mb-4 d-block">
                <div className="card-header">
                    <h3 className="card-title">Timers</h3>
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-5">
                            <TimerTable addTimerRow={tableAddTimerRow} timersRows={tableTimerRows} />
                            <BadTimerAlert show={this.state.showAlert} handleHideAlert={this.handleHideAlert} />
                        </div>
                        <div className="col-md-5">
                            <TimerClock timers={timers} previewTimer={this.state.previewTimer} selectTimer={this.handleSelectTimer} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

class TimerClock extends React.Component {
    constructor(props) {
        super(props);
        this.selectTimer = this.selectTimer.bind(this);
    }

    selectTimer(id) {
        this.props.selectTimer(Number(id));
    }

    render() {
        var innerData = clockChartData();
        var innerOptions = {
            responsive: true,
            cutoutPercentage: 55,
            legend: {
                display: false
            },
            tooltips: {
                enabled: false
            }
        };
        let previewTimer = this.props.previewTimer;
        let timers = JSON.parse(JSON.stringify(this.props.timers)); //copy to not modify original
        if (previewTimer != null && validTimer(timers, previewTimer) == true) {
            timers.push(previewTimer); //add the preview timer to the timer array
            timers = sortTimers(timers); 
        }
        let getData;
        if (timers.length > 0) { 
            getData = timersToChartData(timers, previewTimer);
        }
        else { //no timers to display, empty clock
            getData = { rotate: (-0.5 * Math.PI), data: { datasets: [{ data: [1], backgroundColor: ['#DDDDDD'], labels: [''] }] } };
        }

        console.log(getData);
        var outerData = getData.data;
        var type = 'doughnut';
        var outerOptions = {
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    var element = elements[0];
                    var i = element._index;
                    if (element._datasetIndex == 0 && outerData.datasets[0].labels[i] !== '') {
                        this.selectTimer(outerData.datasets[0].labels[i]);
                    }
                }
            },
            responsive: true,
            rotation: getData.rotate,
            cutoutPercentage: 70,
            legend: {
                display: false
            },
            tooltips: {
                enabled: false
            }
        }
        return (
            <div id="chartWrapper">
                <img id="hoursImage" src="/hoursImg.png"></img>
                <Doughnut id="overlayedChart" data={innerData} options={innerOptions} height="300" width="300" />
                <Doughnut id="overlayedChart" data={outerData} options={outerOptions} height="300" width="300" />
            </div>
        );
    }
}

class TimerTable extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (
            <table className="table">
                <thead>
                    <tr>
                        <th>Start-End</th>
                        <th>One time</th>
                        <th className="text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {this.props.timersRows}
                    {this.props.addTimerRow}
                </tbody>
            </table>
        );
    }
}

class TimerRow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            removeButtonDisabled: false,
        };
        this.removeTimer = this.removeTimer.bind(this);
    }

    removeTimer(id) {
        this.setState({ removeButtonDisabled: true }); //avoid adding the same timer multiple times
        setTimeout(() => { this.setState({ removeButtonDisabled: false }) }, 1000);//After 1 second, re-enable the button
        const socket = this.props.socket;
        socket.emit('deviceAction', this.props.deviceID, 'removeTimer', { id: this.props.timer.id });
    }

    render() {
        let timer = this.props.timer;
        let timeStr = formatTimer(timer);
        let temp = <td className="text-danger">No</td>;
        if (timer.temp == true) {
            temp = <td className="text-warning">Yes</td>;
        }
        let selected = "";
        if (this.props.selected === timer.id) {
            selected = "table-active";
        }
        return (
            <tr className={selected} key={timer.id}>
                <td className="text-left">{timeStr}</td>
                {temp}
                <td className="text-left">
                    <button type="button" rel="tooltip" onClick={this.removeTimer}
                        className="btn btn-sm btn-danger btn-round" disabled={this.state.removeButtonDisabled}>
                        <i className="material-icons">close</i>
                    </button>
                </td>
            </tr>
        );
    }
}

class AddTimerRow extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            addButtonDisabled: false,
            previewTimer: {
                id: -1,
                sh: -1,
                sm: -1,
                eh: -1,
                em: -1,
                temp: false
            }

        };
        this.startTimeValueRef = React.createRef();
        this.endTimeValueRef = React.createRef();
        this.addTimer = this.addTimer.bind(this);
        this.timeInputChange = this.timeInputChange.bind(this);
    }

    addTimer() {
        let timer = this.state.previewTimer;
        if (validTimer(this.props.timers, timer)) { //validate timer before adding
            this.setState({ addButtonDisabled: true }); //avoid adding the same timer multiple times
            setTimeout(() => { this.setState({ addButtonDisabled: false }) }, 1000);//After 1 second, re-enable the button
            const socket = this.props.socket;
            socket.emit('deviceAction', this.props.deviceID, 'addTimer', timer);
            this.startTimeValueRef.current.value = "";
            this.endTimeValueRef.current.value = "";
            this.setState({
                previewTimer: {
                    id: -1,
                    sh: -1,
                    sm: -1,
                    eh: -1,
                    em: -1,
                    temp: false
                }
            });

        }
        else {
            this.props.handleShowAlert();
        }
    }

    timeInputChange(event) {
        let timer = this.state.previewTimer; //copy existing values
        if (event.target.name == "startTimeInput") {
            timer.sh = Number(event.target.value.split(":")[0]); //gets hour from hh:mm format
            timer.sm = Number(event.target.value.split(":")[1]); //gets minute from hh:mm format
        }
        else if (event.target.name == "endTimeInput") {
            timer.eh = Number(event.target.value.split(":")[0]);
            timer.em = Number(event.target.value.split(":")[1]);
        }
        else if (event.target.name == "oneTimeCheckInput") {
            timer.temp = event.target.checked;
        }
        this.setState({ previewTimer: timer });
        this.props.handleTimerPreview(timer); //send state up to display it in the clock
    }

    render() {
        let addRowSelected = "";
        if (this.props.selected === -1) {
            addRowSelected = "table-active";
        }
        return (
            <tr className={addRowSelected}>
                <td>
                    Start time:
                    <input type="time" id="default-picker" ref={this.startTimeValueRef} className="form-control" name="startTimeInput" onChange={this.timeInputChange}></input>
                    End time:
                    <input type="time" id="default-picker" ref={this.endTimeValueRef} className="form-control" name="endTimeInput" onChange={this.timeInputChange}></input>
                </td>
                <td>
                    One time
                            <div className="form-check">
                        <label className="form-check-label">
                            <input className="form-check-input" type="checkbox" name="oneTimeCheckInput" onChange={this.timeInputChange} value=""></input>
                            <span className="form-check-sign">
                                <span className="check"></span>
                            </span>
                        </label>
                    </div>
                </td>
                <td className="text-left">
                    <button type="button" onClick={this.addTimer} className="btn btn-sm btn-success btn-round" disabled={this.state.addButtonDisabled}>
                        Add
                    </button>
                </td>
            </tr>
        );
    }
}
class BadTimerAlert extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        if (this.props.show == false) {
            return null;
        }
        return (
                <div className="alert alert-warning alert-dismissible fade show" role="alert">
                    <strong>Invalid timer</strong> Make sure it does not overlap with other timers.
                    <button type="button" onClick={this.props.handleHideAlert} className="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
        );
    }
}

//converts timers to doughnut chart data
function timersToChartData(timers, previewTimer) {
    let data = { datasets: [{ data: [], backgroundColor: [], labels: [] }] };
    let firstStart = timers[0].sh * 60 + timers[0].sm;
    let lastEnd = timers[timers.length - 1].eh * 60 + timers[timers.length - 1].em;;
    let rotateVal = 1440 - lastEnd + firstStart
    data.datasets[0].data.push(rotateVal);
    data.datasets[0].backgroundColor.push('#DDDDDD'); //light gray
    data.datasets[0].labels.push('');
    let rotateLeft = Math.PI * (-0.5) - ((2 * Math.PI) * ((1440 - lastEnd) / 1440));
    lastEnd = firstStart;
    timers.forEach((timer) => {
        var startTime = timer.sh * 60 + timer.sm;
        var endTime = timer.eh * 60 + timer.em;
        data.datasets[0].data.push(startTime - lastEnd); //gaps between timers
        data.datasets[0].backgroundColor.push('#DDDDDD'); //light gray
        data.datasets[0].labels.push(''); //gap between timer, no value
        data.datasets[0].data.push(endTime - startTime);
        if (timer.id === -1) { //this is a timer preview
            data.datasets[0].backgroundColor.push('#4caf50'); //green
        }
        else if (timer.temp) {
            data.datasets[0].backgroundColor.push('#ff9800'); //orange
        }
        else {
            data.datasets[0].backgroundColor.push('#f44336'); //red
        }
        data.datasets[0].labels.push(timer.id);
        lastEnd = endTime;
    });
    return {
        data: data, rotate: rotateLeft
    };
}

//converts the current time to doughnut chart data which represents a 24-hour clock divided to 0.5 hour sections
//the section matching the current time is highlighted
function clockChartData() {
    var data = { datasets: [{ data: [], backgroundColor: [], labels: [] }] };
    var now = new Date();
    var nowTime = now.getHours() * 60 + now.getMinutes();
    for (var i = 0; i < 48; i++) {
        data.datasets[0].data.push(30); //half hour sections
        if (nowTime < (i + 1) * 30 && nowTime >= i * 30) { 
            data.datasets[0].backgroundColor.push('#AAAAAA') //gray
        }
        else {
            data.datasets[0].backgroundColor.push('#EEEEEE') //very light gray
        }
        data.datasets[0].labels.push('');
    }
    return data;
}

function validTimer(timers, newTimer) { //assuming existing timers don't overlap
    let newStart = newTimer.sh * 60 + newTimer.sm;
    let newEnd = newTimer.eh * 60 + newTimer.em;
    if (newStart >= newEnd) {
        return false; //start can't be after end
    }
    for (let i = 0; i < timers.length; i++) {
        let existingTimer = timers[i];
        let existingStart = existingTimer.sh * 60 + existingTimer.sm;
        let existingEnd = existingTimer.eh * 60 + existingTimer.em;
        if (numberInRange(existingStart, newStart, existingEnd)
            || numberInRange(existingStart, newEnd, existingEnd)
            || numberInRange(newStart, existingStart, newEnd)
            || numberInRange(newStart, existingEnd, newEnd)) {
            return false; //the timer overlaps with other timers
        }
    }
    return true; //if there is an overlap return false
}