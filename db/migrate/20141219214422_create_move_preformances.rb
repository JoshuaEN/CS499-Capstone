class CreateMovePreformances < ActiveRecord::Migration
  def change
    create_table :move_preformances do |t|
      t.integer :move,          limit: 1
      t.integer :time,          limit: 8
      t.integer :controller_id
      t.integer :match_result
      t.boolean  :verification_run
      t.integer :verification_set
      t.integer :player,        limit: 1

      t.timestamps
    end
    add_index :move_preformances, :move
    add_index :move_preformances, :time
    add_index :move_preformances, :controller_id
    add_index :move_preformances, :match_result
    add_index :move_preformances, :verification_set
    add_index :move_preformances, :verification_run
    add_index :move_preformances, :player
  end
end
