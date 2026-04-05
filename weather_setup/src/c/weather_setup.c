#include <pebble.h>

static Window *s_window;
static TextLayer *s_text_layer;
static int current_condition=-1;


#define SETTINGS_KEY 0

void request_weather_update() {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Requesting weather update");

  DictionaryIterator *iter;
  AppMessageResult result = app_message_outbox_begin(&iter);

  if (result != APP_MSG_OK) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Failed to begin outbox: %d", (int)result);
    return;
  }

  result = dict_write_uint8(iter, MESSAGE_KEY_WEATHER_REQUEST, 1);

  result = app_message_outbox_send();
  if (result != APP_MSG_OK) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "Failed to send message: %d", (int)result);
  }
}


static char* weather_condition_reference(int condition){
  switch(condition/10){
    case 0:
      switch(condition){
        case 0:
          return "Clear Sky";
        case 1:
          return "Mainly Clear";
        case 2:
          return "Partly Clear";
        case 3:
          return "Overcast";
        default:
          return "AAAA";
      }
    case 4:
      switch(condition){
        case 45:
          return "Fog";
        case 48:
          return "Depositing rime fog";
        default:
          return "AAAA";
      }
    case 5:
      switch(condition){
        case 51:
          return "Drizzle Light";
        case 53:
          return "Drizzle Moderate";
        case 55:
          return "Drizzle Dense";
        case 56:
          return "Freezing Drizzle: Light";
        case 57:
          return "Freezing Drizzle: Dense";
        default:
          return "AAAA";
      }
    case 6:
      switch(condition){
        case 61:
          return "Rain Light";
        case 63:
          return "Rain Moderate";
        case 65:
          return "Rain Dense";
        case 66:
          return "Freezing Rain: Light";
        case 67:
          return "Freezing Rain: Dense";
        default:
          return "AAAA";
      }
    case 7:
      switch(condition){
        case 71:
          return "Snow Light";
        case 73:
          return "Snow Moderate";
        case 75:
          return "Snow Dense";
        case 77:
          return "Snow Grains";
        default:
          return "AAAA";
      }
    case 8:
      switch(condition){
        case 81:
          return "Rain Showers Light";
        case 83:
          return "Rain Showers Moderate";
        case 85:
          return "Rain Showers Dense";
        case 86:
          return "Snow Showers Light";
        case 87:
          return "Snow Showers Heavy";
        default:
          return "AAAA";
      }
    case 9:
      switch(condition){
        case 95:
          return "Thunderstorm Light";
        case 96:
          return "Thunderstorm with slight hail";
        case 99:
          return "Thunderstorm with heavy hail";
        default:
          return "AAAA";
      }
    default:
      return "AAAA";
  }

}

static void load_settings() {
  //default_settings();
  persist_read_data(SETTINGS_KEY, &current_condition, sizeof(current_condition));
}

static void save_settings() {
  //default_settings();
  persist_write_data(SETTINGS_KEY, &current_condition, sizeof(current_condition));
}

static void prv_select_click_handler(ClickRecognizerRef recognizer, void *context) {
  request_weather_update();
  text_layer_set_text(s_text_layer, weather_condition_reference(current_condition));
}

static void prv_click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, prv_select_click_handler);
}

static void prv_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_text_layer = text_layer_create(GRect(0, 72, bounds.size.w, 20));
  text_layer_set_text(s_text_layer, "Press a button");
  text_layer_set_text_alignment(s_text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(s_text_layer));
}

static void prv_window_unload(Window *window) {
  text_layer_destroy(s_text_layer);
}

static void prv_inbox_received_handler(DictionaryIterator *iter, void *context) {

  Tuple *condition_tuple = dict_find(iter, MESSAGE_KEY_weather_condition);
  if (condition_tuple) {
    current_condition = (condition_tuple->value->int32);
    APP_LOG(APP_LOG_LEVEL_DEBUG, "condition %d", current_condition);
  }

  text_layer_set_text(s_text_layer, weather_condition_reference(current_condition));

}
static void prv_init(void) {
  s_window = window_create();
  window_set_click_config_provider(s_window, prv_click_config_provider);
  window_set_window_handlers(s_window, (WindowHandlers) {
    .load = prv_window_load,
    .unload = prv_window_unload,
  });
  const bool animated = true;
  window_stack_push(s_window, animated);

  app_message_register_inbox_received(prv_inbox_received_handler);
  app_message_open(128, 128);
}

static void prv_deinit(void) {
  window_destroy(s_window);
}

int main(void) {
  prv_init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", s_window);

  app_event_loop();
  prv_deinit();
}
