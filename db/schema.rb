# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20141202203820) do

  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "controller_trackers", force: true do |t|
    t.text     "controller_ident", null: false
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "controller_trackers", ["controller_ident"], name: "index_controller_trackers_on_controller_ident", unique: true, using: :btree

  create_table "match_results", force: true do |t|
    t.integer  "winner"
    t.integer  "p1_disks",          null: false
    t.integer  "p0_disks",          null: false
    t.text     "final_board_state", null: false
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "board_size",        null: false
    t.integer  "p0_controller_id"
    t.integer  "p1_controller_id"
  end

  add_index "match_results", ["board_size"], name: "index_match_results_on_board_size", using: :btree
  add_index "match_results", ["final_board_state"], name: "index_match_results_on_final_board_state", using: :btree
  add_index "match_results", ["p0_controller_id"], name: "index_match_results_on_p0_controller_id", using: :btree
  add_index "match_results", ["p0_disks"], name: "index_match_results_on_p0_disks", using: :btree
  add_index "match_results", ["p1_controller_id"], name: "index_match_results_on_p1_controller_id", using: :btree
  add_index "match_results", ["p1_disks"], name: "index_match_results_on_p1_disks", using: :btree
  add_index "match_results", ["winner"], name: "index_match_results_on_winner", using: :btree

end
