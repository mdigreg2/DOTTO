import { Resolver, Field, Args, Mutation, Ctx, ArgsType } from 'type-graphql';
import { requirePaymentSystemInitialized, stripeClient } from '../../stripe/init';
import { GraphQLContext } from '../../utils/context';
import { verifyLoggedIn } from '../../auth/checkAuth';
import { ObjectId } from 'mongodb';
import { UserModel } from '../../schema/users/user';
import PaymentMethod, { PaymentMethodModel, CreditCardBrand } from '../../schema/users/paymentMethod';
import { validateCurrency } from '../../currencies/utils';
import { MinLength } from 'class-validator';
import ReturnObj from '../../schema/utils/returnObj';
import { getLogger } from 'log4js';
import { ApolloError } from 'apollo-server-express';
import statusCodes from 'http-status-codes';
import getUserCurrency from '../getUserCurrency';

const logger = getLogger();

@ArgsType()
class AddPaymentMethodArgs {
  @Field({ description: 'name' })
  currency: string;

  @MinLength(5, { message: 'invalid stripe card token provided' })
  @Field({ description: 'stripe card token' })
  cardToken: string;

  @Field({ description: 'set to default', defaultValue: true, nullable: true })
  setDefault: boolean;
}

@Resolver()
class AddPaymentMethodResolver {
  @Mutation(_returns => ReturnObj)
  async addPaymentMethod(@Args() args: AddPaymentMethodArgs, @Ctx() ctx: GraphQLContext): Promise<ReturnObj> {
    requirePaymentSystemInitialized();
    if (!verifyLoggedIn(ctx)) {
      throw new Error('user not logged in');
    }
    args.currency = await validateCurrency(args.currency);

    const userID = new ObjectId(ctx.auth?.id as string);
    const userData = await UserModel.findById(userID);
    if (!userData) {
      throw new Error(`cannot find user with id ${userID.toHexString()}`);
    }

    if (await PaymentMethodModel.countDocuments({
      user: userID,
      currency: args.currency,
      method: args.cardToken
    }) > 0) {
      throw new Error('payment method already exists');
    }

    const userCurrencyData = await getUserCurrency(args.currency, userData);

    const cardData = await stripeClient.paymentMethods.retrieve(args.cardToken);
    if (!cardData.card) {
      throw new ApolloError('cannot get card data', `${statusCodes.INTERNAL_SERVER_ERROR}`);
    }
    const setupIntent = await stripeClient.setupIntents.create({
      confirm: true,
      customer: userCurrencyData.customer,
      payment_method: args.cardToken,
      payment_method_types: ['card'],
      description: `setup intent for adding ${args.cardToken} to user ${userID.toHexString()}`,
    });
    if (setupIntent.next_action) {
      logger.info(setupIntent.next_action);
      throw new Error('not handled next action');
    }
    const lastFourDigits = new Number(cardData.card.last4);
    if (!lastFourDigits) {
      throw new ApolloError('cannot cast last four digits to string', `${statusCodes.INTERNAL_SERVER_ERROR}`);
    }
    const brand = CreditCardBrand[cardData.card.brand as keyof typeof CreditCardBrand];
    const newPaymentMethod: PaymentMethod = {
      _id: new ObjectId(),
      user: userID,
      currency: args.currency,
      method: args.cardToken,
      brand,
      lastFourDigits: lastFourDigits.valueOf(),
    };
    await new PaymentMethodModel(newPaymentMethod).save();
    if (args.setDefault) {
      await stripeClient.customers.update(userCurrencyData.customer, {
        invoice_settings: {
          default_payment_method: args.cardToken,
        }
      });
      await UserModel.updateOne({
        _id: userID
      }, {
        $set: {
          defaultPaymentMethod: newPaymentMethod._id,
        }
      });
    }
    return {
      message: `added / updated payment method ${newPaymentMethod._id.toHexString()}`,
      _id: newPaymentMethod._id,
    };
  }
}

export default AddPaymentMethodResolver;
