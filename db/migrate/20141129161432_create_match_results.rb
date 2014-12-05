class CreateMatchResults < ActiveRecord::Migration
  def change
    create_table :match_results do |t|
      t.string :p1_controller, null: false
      t.string :p0_controller, null: false
      t.integer :winner, null: false
      t.integer :p1_disks, null: false
      t.integer :p0_disks, null: false
      t.text :final_board_state, null: false

      t.timestamps
    end
    add_index :match_results, :p1_controller
    add_index :match_results, :p0_controller
    add_index :match_results, :p1_disks
    add_index :match_results, :p0_disks

    add_index :match_results, :final_board_state
    add_index :match_results, :winner
  end
end
