class AddBoardSizeToMatchResults < ActiveRecord::Migration
  def change
    add_column :match_results, :board_size, :integer, null: false
    add_index :match_results, :board_size
  end
end
