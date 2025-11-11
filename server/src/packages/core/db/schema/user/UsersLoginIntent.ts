import {
  Sequelize, DataTypes, Model,
} from 'sequelize';

interface UsersLoginIntentAttributes {
  id:number;
  ref_id:string;
  user_ref_id:string;
  login_intent:string;
  login_code_hash:string;
  expires_at: Date;
  login_at: Date;
  active: boolean;
  attempt: number;
  created_at: Date;
  updated_at: Date;
}

class UsersLoginIntent extends Model<UsersLoginIntentAttributes>
  implements UsersLoginIntentAttributes {
  public id!:number;

  public ref_id!:string;

  public user_ref_id!:string;

  public login_intent!:string;

  public login_code_hash!:string;

  public expires_at!: Date;

  public login_at!: Date;

  public active!: boolean;

  public attempt!: number;

  public created_at!: Date;

  public updated_at!: Date;
}

function initUsersLoginIntentModel(sequelize: Sequelize) {
  UsersLoginIntent.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      ref_id: { type: DataTypes.STRING },
      user_ref_id: { type: DataTypes.STRING },
      login_intent: { type: DataTypes.STRING },
      login_code_hash: { type: DataTypes.STRING },
      expires_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      login_at: { type: DataTypes.DATE },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      attempt: { type: DataTypes.NUMBER, allowNull: false, defaultValue: 0 },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'UsersLoginIntent',
      tableName: 'users_login_intents',
      underscored: true,
    },
  );

  return UsersLoginIntent;
}

export default initUsersLoginIntentModel;
