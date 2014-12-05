class ChangeP0ControllerAndP1Controller < ActiveRecord::Migration
  def change
  	change_column :match_results, :p0_controller, :text, null: false
  	change_column :match_results, :p1_controller, :text, null: false
  end
end
