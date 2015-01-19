class AddValidMovesToMovePreformance < ActiveRecord::Migration
  def change
    add_column :move_preformances, :valid_moves, :integer
    add_index :move_preformances, :valid_moves
  end
end
