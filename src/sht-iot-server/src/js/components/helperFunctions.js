export function getColor(color) {
    if (color === "purple") return "primary"; //##9c27b0
    if (color === "blue") return "info"; //#00bcd4
    if (color === "green") return "success"; //#4caf50
    if (color === "red") return "danger"; //#f44336
    if (color === "orange") return "warning"; //#ff9800
    return "default"; //gray #999999
}

export function URLName(name) {
    return name.replace(/\W+/g, '-'); //replace non-alphanumeric chars with dashes
}

export function twoDigits(num) {
    if (num > 9) {
        return num;
    }//else num<9, add 0
    return '0' + num;
}

export function formatTimer(timer) {
    return hourMinute(timer.startHour, timer.startMinute) +
        '-' + hourMinute(timer.endHour, timer.endMinute);
}

export function hourMinute(hour, minute) {
    return twoDigits(hour) + ":" + twoDigits(minute);
}


export function numberInRange(start, num, end) {
    return num >= start && num <= end;
}

export function sortTimers(timers) {
    timers.sort((a, b) => { //sort the timers by the time they start (assuming they don't interserct)
        if (a.startHour * 60 + a.startMinute > b.startHour * 60 + b.startMinute)
            return 1;
        else if (a.startHour * 60 + a.startMinute < b.startHour * 60 + b.startMinute)
            return -1;
        else
            return 0;
    });
    return timers;
}