Rails.application.routes.draw do
  root 'static_pages#index'  

  get '/r', to: 'match_results#view' if Rails.env.development?
  get '/rjson', to: 'match_results#view_json' if Rails.env.development?
  get '/cljson', to: 'match_results#controller_json' if Rails.env.development?

  post '/record_result', to: 'match_results#record' if Rails.env.development?
  get '/record_result', to: 'match_results#record' if Rails.env.development?


  get '(:board_size)', to: 'static_pages#index'
end
