class MatchResultsController < ApplicationController
	protect_from_forgery :except => :record 
	
	def record
		# Not allowed unless we're in development mode.
		if Rails.env.development? == false
			head 406
			return
		end

		p0_id = ControllerTracker.get_or_create(params.delete :p0_controller).id
		p1_id = ControllerTracker.get_or_create(params.delete :p1_controller).id

		if(params[:winner] == "null")
			params[:winner] = nil
		end

		mr = MatchResult.create!(params.permit(:p0_disks, :p1_disks, :winner, :final_board_state, :board_size).merge(p0_controller_id: p0_id, p1_controller_id: p1_id))

		if params.key? :performance
			params[:performance].each do |pref_str|

				pref =  ActionController::Parameters.new(Rack::Utils.parse_nested_query(pref_str))
				if pref[:player].to_i == 0
					pref[:controller_id] = p0_id
				elsif pref[:player].to_i == 1
					pref[:controller_id] = p1_id
				else
					raise "No Controller Key Given"
				end

				if pref[:verification_run] == "True"
					pref[:verification_run] = true
				else
					pref[:verification_run] = false
				end

				pref[:match_result] = mr.id

				MovePreformance.create!(pref.permit(:move, :time, :controller_id, :match_result, :verification_run, :verification_set, :player, :valid_moves))
			end
		end

		head 200
		return
	end

	def adative_ai_test

	end

	def view
	end

	def view_json
		base_query = MatchResult.where(p0_controller_id: params[:p0], p1_controller_id: params[:p1], board_size: params[:size])

		hash = {}

		base_query.select(
				'count(*) as games_played,' +
				'count(DISTINCT final_board_state) as unique_final_board_states,' +
				'avg(p0_disks-p1_disks) as average_disk_difference,' +
				'stddev_pop(p0_disks-p1_disks) as stddev_disk_difference'
			).each do |info|
			hash[:games_played] = info.games_played
			hash[:unique_final_board_states] = info.unique_final_board_states
			hash[:average_disk_difference] = info.average_disk_difference
			hash[:stddev_disk_difference] = info.stddev_disk_difference
			break
		end

		hash[:wins] = Hash[base_query.select('count(*) as count, winner').group('winner').map{|winner_data| 
				[winner_data.winner, 
				{
					number: winner_data.count,
					wr: (winner_data.count*100.0/hash[:games_played])
				}]
			}.sort_by{|a| a[0] || -1}]

		render json: hash
		return
	end

	def controller_json
		render json: ControllerTracker.select("id, controller_ident").order("id desc")
		return
	end

	def view_all_json
		hash = {};

		base_query = MatchResult.group("p0_controller_id, p1_controller_id, board_size")
		base_s_query = base_query.select(
				'count(*) as games_played,' +
				'count(DISTINCT final_board_state) as unique_final_board_states,' +
				'avg(p0_disks-p1_disks) as average_disk_difference,' +
				'stddev_pop(p0_disks-p1_disks) as stddev_disk_difference,' +
				'count(case winner when null then 1 else null end) as ties_wins,' +
				'count(case winner when \'0\' then 1 else null end) as dark_wins,' +
				'count(case winner when \'1\' then 1 else null end) as light_wins,' +
				'p0_controller_id, p1_controller_id, board_size, sum(p0_disks) as p0_disks, sum(p1_disks) as p1_disks'
			).order("max(created_at) desc")


		hash[:data] = base_s_query.map do |info|
			{
				p0: info.p0_controller_id,
				p1: info.p1_controller_id,
				p0_disks: info.p0_disks,
				p1_disks: info.p1_disks,
				board_size: info.board_size,
				games_played: info.games_played,
				unique_final_baord_states: info.unique_final_board_states,
				average_disk_difference: info.average_disk_difference,
				stddev_disk_difference: info.stddev_disk_difference,
				wins: {
					nil: {
						number: info.games_played - (info.light_wins+info.dark_wins),
						wr: ((info.games_played - (info.light_wins+info.dark_wins))*100.0/info.games_played)
					},
					0 => {
						number: info.dark_wins,
						wr: (info.dark_wins*100.0/info.games_played)
					},
					1 => {
						number: info.light_wins,
						wr: (info.light_wins*100.0/info.games_played)
					}

				}
			}
		end

		# hash[:wins] = Hash[base_query.select('count(*) as count, winner').group('winner').map{|winner_data| 
		# 		[winner_data.winner, 
		# 		{
		# 			number: winner_data.count,
		# 			wr: (winner_data.count*100.0/hash[:games_played])
		# 		}]
		# 	}.sort_by{|a| a[0] || -1}]

		render json: hash
		return
	end
end