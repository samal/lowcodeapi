import {
  Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes,
} from 'sequelize';

interface CredentialsModel
  extends Model<InferAttributes<CredentialsModel>, InferCreationAttributes<CredentialsModel>> {
  id: number;
  user_ref_id: string;
  provider: string;
  auth_type: string;
  credentials: { [key: string]: any },
  config: { [key: string]: any };
  provider_data: { [key: string]: any };
  active: boolean;
  descriptions: string;
  remark: string;
  provider_error: { [key: string]: any };
  created_at: Date;
  updated_at: Date;
}

const Credentials = (sequelize: Sequelize) => {
  const Credentials = sequelize.define<CredentialsModel>('providers_credential_and_token', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_ref_id: { type: DataTypes.STRING },
    provider: { type: DataTypes.STRING, allowNull: false },
    auth_type: { type: DataTypes.STRING, allowNull: false },
    credentials: { type: DataTypes.JSON },
    config: { type: DataTypes.JSON },
    provider_data: { type: DataTypes.JSON },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    descriptions: { type: DataTypes.TEXT },
    remark: { type: DataTypes.TEXT },
    provider_error: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    underscored: true,
  });

  return Credentials;
};

export default Credentials;
