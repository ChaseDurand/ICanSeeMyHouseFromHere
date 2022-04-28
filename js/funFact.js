function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function getFact(h) {
    // If height is greater than min height reference, use references:
    if (h >= heightReferences[0][0]) {
        i = 0
        while (i < heightReferences.length) {
            if (heightReferences[i][0] < h){
                ++i;
            }
            else {
                break;
            }
        }
        ref = heightReferences[--i];
        return "You are beyond " + ref[1] +"!";
    }
    // Otherwise, use multiples of units:
    else {
        // Find max unit
        i = 0
        while (i < heightUnits.length) {
            if (heightUnits[i][0] < h){
                ++i;
            }
            else {
                break;
            }
        }

        // Randomly get unit that is less than h
        ref = heightUnits[getRandomInt(i)];

        if (ref[1] == "CASE_GRAVITY"){
            g = 9.8
            t = Math.round(Math.sqrt(2 * h / g));
            return "It would take " + t + " seconds to hit the ground. Don't slip!";
        }
        else {
            units = Math.round((h / ref[0]) * 10) / 10;
            return "That's equivalent to " + units + "  " + ref[1] + "!";
        }
    }
}

heightUnits = [
    [-1, "CASE_GRAVITY"],
    [443.2, "Empire State Buildings"],
    [508, "Taipei 101s"],
    [829.8, "Burj Khalifas"],
    [8848.86, "Mount Everests"]
]

heightReferences = [
    [35786, "geosynchronous orbit"],
    [100000, "the edge of space"],
    [400000, "the ISS"],
    [550000, "Starlink satellites"],
    [20200000, "GPS satellites"],
    [40000000, "the outer Van Allen belt"],
    [384400000, "the Moon"],
    [62070000000, "Mars"]
]