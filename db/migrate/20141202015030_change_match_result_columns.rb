class ChangeMatchResultColumns < ActiveRecord::Migration
  def change
  	remove_column :match_results, :p0_controller
  	remove_column :match_results, :p1_controller

  	add_column :match_results, :p0_controller_id, :integer
  	add_column :match_results, :p1_controller_id, :integer

  	add_index :match_results, :p0_controller_id
  	add_index :match_results, :p1_controller_id
  end
end
