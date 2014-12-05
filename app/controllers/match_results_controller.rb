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

		MatchResult.create!(params.permit(:p0_disks, :p1_disks, :winner, :final_board_state, :board_size).merge(p0_controller_id: p0_id, p1_controller_id: p1_id))

		head 200
		return
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
			}]

		render json: hash
		return
	end

	def controller_json
		render json: ControllerTracker.select("id, controller_ident")
		return
	end
end