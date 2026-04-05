var Clay = require('@rebble/clay');
var clayConfig = require('./config');
var clay = new Clay(clayConfig, null, { autoHandleEvents: false });



var config = {
    location: '', // Empty = use GPS, otherwise use static location
};

// Load saved configuration
if (localStorage.getItem('WEATHER_LOCATION_CONFIG')) {
    config.location = localStorage.getItem('WEATHER_LOCATION_CONFIG');
}


// Variables to store weather data
var weatherData = {
    condition: -1 // Weather code for condition
};


function fetchWeatherForLocation() {
    console.log('Fetching weather for configured location: ' + config.location);
    weatherData.location = 'Loading...';
    weatherData.temperature = '--';

    // If location is empty or not set, use GPS
    if (!config.location || config.location.trim() === '') {
        console.log('No static location configured, using GPS');
        getLocationAndFetchWeather();
    } else {
        console.log('Using static location: ' + config.location);
        getCoordinatesForCityAndFetchWeather(config.location);
    }
}

function getReverseGeocodingAndFetchWeather(latitude, longitude) {
    console.log('Getting city name for coordinates: ' + latitude + ',' + longitude);

    // Use OpenStreetMap Nominatim for reverse geocoding
    var url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + latitude + '&longitude=' + longitude;

    console.log('Reverse geocoding URL: ' + url);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.log('Reverse geocoding response: ' + xhr.responseText);

                    if (response) {
                        // Try to get city, town, village, or locality
                        var locationName = response.city ||
                        response.locality ||
                        response.countryName ||
                        'GPS Loc';
    weatherData.location = locationName;
    console.log('Found location name: ' + weatherData.location);
                    } else {
                        console.log('No location name found, using GPS coordinates');
                        weatherData.location = 'GPS Loc';
                    }
                } catch (e) {
                    console.log('Reverse geocoding JSON parse error: ' + e.message);
                    weatherData.location = 'GPS Loc';
                }

                // Now get weather data for these coordinates
                getWeatherData(latitude, longitude);
            } else {
                console.log('Reverse geocoding request failed with status: ' + xhr.status);
                weatherData.location = 'GPS Loc';
                // Still get weather data even if reverse geocoding failed
                getWeatherData(latitude, longitude);
            }
        }
    };

    xhr.open('GET', url, true);
    xhr.timeout = 10000;
    xhr.ontimeout = function() {
        console.log('Reverse geocoding request timed out');
        weatherData.location = 'GPS Loc';
        // Still get weather data even if reverse geocoding timed out
        getWeatherData(latitude, longitude);
    };
    xhr.onerror = function() {
        console.log('Reverse geocoding request network error');
        weatherData.location = 'GPS Loc';
        // Still get weather data even if reverse geocoding failed
        getWeatherData(latitude, longitude);
    };
    xhr.send();
}

function getLocationAndFetchWeather() {
    console.log('Getting GPS location...');
    weatherData.location = 'Getting GPS...';

    navigator.geolocation.getCurrentPosition(
        function(pos) {
            var latitude = pos.coords.latitude;
            var longitude = pos.coords.longitude;
            console.log('GPS coordinates: ' + latitude + ',' + longitude);
            // Get city name from reverse geocoding and then get weather
            getReverseGeocodingAndFetchWeather(latitude, longitude);
        },
        function(err) {
            console.log('GPS location error: ' + err.message);
            weatherData.location = 'GPS Error';
            weatherData.temperature = 'N/A';
            weatherData.condition = -1;
            sendDataToPebble();
        },
        {
            timeout: 15000,
            maximumAge: 60000
        }
    );
}

function getCoordinatesForCityAndFetchWeather(cityName) {
    console.log('Getting coordinates for: ' + cityName);

    var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
    encodeURIComponent(cityName) + '&count=1&language=en&format=json';

    console.log('Geocoding URL: ' + url);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.log('Geocoding response: ' + xhr.responseText);

                    if (response.results && response.results.length > 0) {
                        var result = response.results[0];
                        var latitude = result.latitude;
                        var longitude = result.longitude;
                        var locationName = result.name || cityName;

                        console.log('Found coordinates: ' + latitude + ',' + longitude + ' for ' + locationName);
                        weatherData.location = locationName;

                        // Now get weather data for these coordinates
                        getWeatherData(latitude, longitude);
                    } else {
                        console.log('No results found for city: ' + cityName);
                        weatherData.location = config.location + ' Not Found';
                        weatherData.temperature = 'N/A';
                        weatherData.condition = -1;
                        sendDataToPebble();
                    }
                } catch (e) {
                    console.log('Geocoding JSON parse error: ' + e.message);
                    weatherData.location = 'Parse Error';
                    weatherData.temperature = 'N/A';
                    weatherData.condition = -1;
                    sendDataToPebble();
                }
            } else {
                console.log('Geocoding request failed with status: ' + xhr.status);
                weatherData.location = 'Geocode Error';
                weatherData.temperature = 'N/A';
                weatherData.condition = -1;
                sendDataToPebble();
            }
        }
    };

    xhr.open('GET', url, true);
    xhr.timeout = 10000;
    xhr.ontimeout = function() {
        console.log('Geocoding request timed out');
        weatherData.location = 'Timeout';
        weatherData.temperature = 'N/A';
        weatherData.condition = -1;
        sendDataToPebble();
    };
    xhr.onerror = function() {
        console.log('Geocoding request network error');
        weatherData.location = 'Net Error';
        weatherData.temperature = 'N/A';
        weatherData.condition = -1;
        sendDataToPebble();
    };
    xhr.send();
}

function getWeatherData(latitude, longitude) {
    // Request sunrise and sunset for today, along with current weather
    var now = new Date();
    var yyyy = now.getUTCFullYear();
    var mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    var dd = String(now.getUTCDate()).padStart(2, '0');
    var today = yyyy + '-' + mm + '-' + dd;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' +
    latitude + '&longitude=' + longitude +
    '&current=weather_code' ;

    console.log('Fetching weather from: ' + url);

    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            console.log('Weather request completed with status: ' + xhr.status);
            if (xhr.status === 200) {
                try {
                    var response = JSON.parse(xhr.responseText);
                    console.log('Weather response: ' + xhr.responseText);

                    if (response.current) {
                        weatherData.condition = response.current.weathercode || 0;

                        console.log('Condition: ' + weatherData.condition);
                        sendDataToPebble();
                    } else {
                        console.log('Invalid weather response format - no current_weather');
                        weatherData.condition = -1;
                        sendDataToPebble();
                    }
                } catch (e) {
                    console.log('Weather JSON parse error: ' + e.message);
                    weatherData.condition = -1;
                    sendDataToPebble();
                }
            } else {
                console.log('Weather request failed with status: ' + xhr.status + ', response: ' + xhr.responseText);
                weatherData.condition = -1;
                sendDataToPebble();
            }
        }
    };

    xhr.open('GET', url, true);
    xhr.timeout = 15000;
    xhr.ontimeout = function() {
        console.log('Weather request timed out');
        weatherData.condition = -1;
        sendDataToPebble();
    };
    xhr.onerror = function() {
        console.log('Weather request network error');
        weatherData.condition = -1;
        sendDataToPebble();
    };
    xhr.send();
}

function sendDataToPebble() {
    console.log('Sending data to pebble.');

    var message = {
        'weather_condition': weatherData.condition
    };

    Pebble.sendAppMessage(message,
                          function(e) {
                              console.log('Data sent successfully');
                          },
                          function(e) {
                              console.log('Failed to send data: ' + e.error.message);
                          }
    );
}
// Event listeners from app
Pebble.addEventListener('appmessage', function(e) {
    console.log('AppMessage received: ' + JSON.stringify(e.payload));

    // Check if it's a weather update request
    if (e.payload.WEATHER_REQUEST) {
        console.log('Weather update requested from watch');
        fetchWeatherForLocation();
    }

    // Check if it's a location configuration update
    if (e.payload.WEATHER_LOCATION_CONFIG) {
        config.location = e.payload.WEATHER_LOCATION_CONFIG;
        console.log('Location configuration updated to: ' + config.location);
        fetchWeatherForLocation();
    }
});


// Update weather every 30 minutes
setInterval(function() {
    console.log('Periodic weather update (30min timer) for: ' + config.location);
    fetchWeatherForLocation();
}, 30 * 60 * 1000);



Pebble.addEventListener('showConfiguration', function(e) {
    Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
    if (e && !e.response) {
        return;
    }

    // Get Clay items with their messageKeys intact
    var claySettings = clay.getSettings(e.response, false);
    console.log('Clay settings:', JSON.stringify(claySettings));



    if (claySettings.weather_location !== undefined) {
        config.location = claySettings.weather_location.value || ''; // Empty string for GPS
        localStorage.setItem('WEATHER_LOCATION_CONFIG', config.location);
        console.log('Location saved to: "' + config.location + '" (empty = GPS)');
        fetchWeatherForLocation();
    }

});
