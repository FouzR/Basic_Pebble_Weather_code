

module.exports = [
    {
        "type": "heading",
        "defaultValue": "Basic Weather"
    },
{
    "type": "section",
    "items": [
        {
            "type": "heading",
            "defaultValue": "Weather"
        },
        {
            "type": "input",
            "messageKey": "weather_location",
            "label": "Location",
            "defaultValue": "",
            "description": "Enter your city name (e.g., Vienna, New York, Tokyo) or leave empty to use GPS location automatically. Weather data is fetched from Open-Meteo API.",
            "attributes": {
                "placeholder": "e.g., Vienna (or leave empty for GPS)"
            }
        }
    ],
    {
        type: "submit",
        defaultValue: "Save Settings"
    }
}
];
