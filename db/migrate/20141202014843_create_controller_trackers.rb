class CreateControllerTrackers < ActiveRecord::Migration
  def change
    create_table :controller_trackers do |t|
      t.text :controller_ident, null: false

      t.timestamps
    end

    add_index :controller_trackers, :controller_ident, unique: true
  end
end
