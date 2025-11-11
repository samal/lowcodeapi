import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface TrackIntentRequestAttributes {
  id: number;
  user_ref_id: string;
  provider: string;
  method: string;
  intent: string;
  created_at: Date;
  updated_at: Date;
}

class TrackIntentRequest
  extends Model<TrackIntentRequestAttributes> implements TrackIntentRequestAttributes {
  public id!: number;

  public user_ref_id!: string;

  public provider!: string;

  public method!: string;

  public intent!: string;

  public created_at!: Date;

  public updated_at!: Date;
}

function init(sequelize: Sequelize) {
  TrackIntentRequest.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      user_ref_id: { type: DataTypes.STRING, allowNull: false },
      provider: { type: DataTypes.STRING, allowNull: false },
      method: { type: DataTypes.STRING, allowNull: false },
      intent: { type: DataTypes.STRING, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'TrackIntentRequest',
      tableName: 'track_intent_request',
      underscored: true,
    },
  );

  return TrackIntentRequest;
}

export default init;
