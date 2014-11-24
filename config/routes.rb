Rails.application.routes.draw do
  root 'static_pages#index'
  get '(:board_size)', to: 'static_pages#index'
end
