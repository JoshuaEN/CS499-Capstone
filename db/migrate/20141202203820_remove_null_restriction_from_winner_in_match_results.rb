class RemoveNullRestrictionFromWinnerInMatchResults < ActiveRecord::Migration
  def change
  	change_column :match_results, :winner, :integer, null: true
  end
end
