import { Resolver, Field, Args, Mutation, Ctx, ArgsType } from 'type-graphql';
import { GraphQLContext } from '../utils/context';
import { verifyLoggedIn } from '../auth/checkAuth';
import { stripeClient, requirePaymentSystemInitialized } from './init';
import { Interval, singlePurchase } from '../schema/payments/plan';
import { ProductModel } from '../schema/payments/product';
import { ObjectId } from 'mongodb';
import { UserModel } from '../schema/users/user';
import Coupon, { CouponModel } from '../schema/payments/coupon';
import { getExchangeRate } from '../currencies/getExchangeRate';
import { PaymentMethodModel } from '../schema/users/paymentMethod';
import { UserCurrencyModel } from '../schema/users/userCurrency';
import { configData } from '../utils/config';

@ArgsType()
export class PurchaseArgs {
  @Field({ description: 'product id' })
  product: string;

  @Field(_type => Interval, { description: 'plan interval for product' })
  interval: Interval;

  @Field({ description: 'coupon - only allow one at a time for now', nullable: true })
  coupon?: string;

  @Field({ description: 'payment method id', nullable: true })
  paymentMethod?: ObjectId;
}

@Resolver()
class PurchaseResolver {
  @Mutation(_returns => String)
  async purchase(@Args() args: PurchaseArgs, @Ctx() ctx: GraphQLContext): Promise<string> {
    requirePaymentSystemInitialized();
    if (!verifyLoggedIn(ctx)) {
      throw new Error('user not logged in');
    }

    let coupon: Coupon | null = null;
    // check coupon
    if (args.coupon && args.coupon.length > 0) {
      const couponData = await CouponModel.findOne({
        name: args.coupon
      });
      if (!couponData) {
        throw new Error(`cannot find coupon with secret ${args.coupon}`);
      }
      coupon = couponData;
    }

    const userID = new ObjectId(ctx.auth?.id);
    const user = await UserModel.findById(userID);
    if (!user) {
      throw new Error(`cannot find user with id ${userID.toHexString()}`);
    }

    if (!args.paymentMethod) {
      if (!user.defaultPaymentMethod) {
        throw new Error('no default payment method found');
      }
      if (await PaymentMethodModel.countDocuments({
        _id: user.defaultPaymentMethod
      }) === 0) {
        const newDefaultPaymentMethod = await PaymentMethodModel.findOne({
          user: userID
        });
        if (!newDefaultPaymentMethod) {
          throw new Error('cannot find any payment methods to make default');
        }
        user.defaultPaymentMethod = newDefaultPaymentMethod._id;
        await UserModel.updateOne({
          _id: userID
        }, {
          defaultPaymentMethod: user.defaultPaymentMethod
        });
      }
      args.paymentMethod = user.defaultPaymentMethod;
    }

    const paymentMethod = await PaymentMethodModel.findById(args.paymentMethod);
    if (!paymentMethod) {
      throw new Error(`cannot find payment method with id ${args.paymentMethod.toHexString()}`);
    }

    const userCurrencyData = await UserCurrencyModel.findOne({
      user: userID,
      currency: paymentMethod.currency,
    });
    if (!userCurrencyData) {
      throw new Error('cannot find user currency data');
    }

    const product = await ProductModel.findOne({
      name: args.product
    });
    if (!product) {
      throw new Error(`cannot find product ${args.product}`);
    }

    let amount = 0;
    const foundPlan = false;
    let subscriptionPlanID: string | null = null;
    for (const plan of product.plans) {
      if (plan.interval === args.interval) {
        if (plan.interval === singlePurchase) {
          amount = plan.amount;
        } else {
          let foundCurrency = false;
          for (const currency in plan.currencies) {
            if (currency === paymentMethod.currency) {
              foundCurrency = true;
              subscriptionPlanID = plan.currencies[currency];
            }
          }
          if (!foundCurrency) {
            throw new Error(`could not find currency ${paymentMethod.currency} in plan`);
          }
        }
      }
    }
    if (!foundPlan) {
      throw new Error(`could not find plan with interval ${args.interval}`);
    }

    let clientSecret = '';
    if (args.interval !== singlePurchase) {
      if (user.subscriptionID.length > 0) {
        await stripeClient.subscriptions.del(user.subscriptionID);
      }
      const newSubscription = await stripeClient.subscriptions.create({
        customer: userCurrencyData.customer,
        items: [{
          plan: subscriptionPlanID as string
        }],
        coupon: coupon ? coupon.name : undefined
      });
      await UserModel.updateOne({
        _id: userID
      }, {
        $set: {
          plan: product.name,
          subscriptionID: newSubscription.id
        }
      });
    } else {
      if (coupon) {
        if (coupon.isPercent) {
          amount *= coupon.amount / 100.0;
        } else {
          amount -= coupon.amount;
          if (amount < 0) {
            amount = 0;
          }
        }
      }
      const exchangeRate = await getExchangeRate(paymentMethod.currency, configData.DISABLE_CACHE);
      // remove cents
      amount = Math.ceil(100 * amount * exchangeRate);
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount,
        currency: paymentMethod.currency,
        metadata: {
          product: product.name,
          userID: userID.toHexString()
        }
      });
      clientSecret = paymentIntent.client_secret as string;
    }

    return clientSecret.length > 0 ? clientSecret :
      `user ${user.username} purchased ${product.name}`;
  }
}

export default PurchaseResolver;
