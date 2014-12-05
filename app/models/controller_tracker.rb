class ControllerTracker < ActiveRecord::Base

	def self.get_or_create controller_ident
		res = where(controller_ident: controller_ident).first

		if res
			return res
		else
			return create!(controller_ident: controller_ident)
		end
	end
end
