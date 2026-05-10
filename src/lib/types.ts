export type SessionUser = {
	id: number;
	email: string;
	nickname: string | null;
};

export type CreatureData = {
	name: string;
	species: string;
	level: number;
	gender: string;
	baseStats: Record<string, number>;
	mutations: Record<string, number>;
	domesticLevels: Record<string, number>;
	notes?: string;
	color?: string;
	server?: string;
	cryopodded?: boolean;
	neutered?: boolean;
	maleBreeder?: boolean;
};

export type CreatureRow = {
	id: number;
	userId: number;
	data: CreatureData;
	createdAt: Date;
};

export type FriendRow = {
	id: number;
	userId: number;
	friendUserId: number;
	status: string;
	friendNickname?: string | null;
	friendEmail?: string;
	friendDiscordName?: string | null;
};
