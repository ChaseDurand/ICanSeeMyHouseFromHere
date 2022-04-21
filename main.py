from geopy.geocoders import Nominatim
import math
from dataclasses import dataclass
import numpy

@dataclass
class Point:
    x: float
    y: float
    z: float

def coorToAngle(lat1, long1, lat2, long2):

    p1 = numpy.array([math.cos(math.radians(lat1)) * math.cos(math.radians(long1)),
            math.cos(math.radians(lat1)) * math.sin(math.radians(long1)),
            math.sin(math.radians(lat1))])
    p2 = numpy.array([math.cos(math.radians(lat2)) * math.cos(math.radians(long2)),
            math.cos(math.radians(lat2)) * math.sin(math.radians(long2)),
            math.sin(math.radians(lat2))])

    numerator = numpy.dot(p1, p2)
    denominator = numpy.linalg.norm(p1) * numpy.linalg.norm(p2)
    angle = math.acos(numerator / denominator)

    return math.degrees(angle)

def angleToHeight(angle):
    rEarth = 6371000

    hypotenuse = rEarth / (math.cos(math.radians(angle)))

    height = hypotenuse - rEarth

    return height

def main():
    print("Hello world!")

    geolocator = Nominatim(user_agent='myUserAgent')
    city="Austin"
    country="USA"
    loc = geolocator.geocode(city+','+country)
    print(loc.latitude, loc.longitude)
    lat1 = loc.latitude
    long1 = loc.longitude
    city="New York City"
    country="USA"
    loc = geolocator.geocode(city+','+country)
    print(loc.latitude, loc.longitude)
    lat2 = loc.latitude
    long2 = loc.longitude
    angle = coorToAngle(lat1, long1, lat2, long2)
    print(angle)

    if angle < 90:
        height = angleToHeight(angle)
        print(height)
    else:
        print("No valid height!")


    
    return

if __name__ == '__main__':
    main()
    exit(0)