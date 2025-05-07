import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order.pagination.dto';
import { StatusDto } from './dto/status.dto';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';
import { PaidOrderDto } from './dto/paid-order.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('Orders-Service');

  constructor(
    @Inject('NATS_SERVICE')
    private client: ClientProxy,
  ){
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }


  async create(createOrderDto: CreateOrderDto)  {

    try {

      const productIds = createOrderDto.items.map( item => item.productId );

      // ? 1: Confirmar los IDs de los productos
      const products = await firstValueFrom(
        this.client.send({ cmd: 'validate_products'}, productIds )
      );

      // ? 2. Cálculo de los valores

      const totalAmount = createOrderDto.items.reduce( (acc, item) => {
        const price = products.find( product => product.id === item.productId ).price;
        acc += item.quantity * price;
        return acc
      }, 0 );

      const totalItems = createOrderDto.items.reduce( ( acc, item ) => acc + item.quantity, 0 )
      
      // ? 3. Transacción base de datos
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map( ( orderItem ) => (
                {
                  price: products.find( product => product.id === orderItem.productId ).price,
                  productId: orderItem.productId,
                  quantity: orderItem.quantity
                }
              ))
            }
          }
        },
        include: { 
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          } 
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map( item => ({
          ...item,
          name: products.find( product => product.id === item.productId ).name,
        }))
      }
      
    } catch (error) {
      console.log('ERROR:', error)
      throw new RpcException({ message: 'Something went wrong. Check logs...', status: HttpStatus.BAD_REQUEST });
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const totalPages = await this.order.count({
      where: { status: orderPaginationDto.status }
    }); // ? Regresa todos si el status es undefined

    const currentPage = orderPaginationDto.page;
    const limit = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        skip: ( currentPage - 1 ) * limit,
        take: limit,
        where: {
          status: orderPaginationDto.status
        }
      }),
      meta: {
        currentPage,
        limit,
        lastPage: Math.ceil( totalPages / limit )
      }
    }
  }

  async findOne(id: string) {

    

    const orderDb = await this.order.findFirst(
      { 
        where: { 
          id 
        },
        include: { 
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            }
          } 
        }
      });

    console.log(orderDb)

    
    
    if( !orderDb )
      throw new RpcException({ message: `Order with id ${ id } not found`, status: HttpStatus.NOT_FOUND })


    const productsId = orderDb.OrderItem.map( item => item.productId );

    // ? 1: Confirmar los IDs de los productos
    const products = await firstValueFrom(
      this.client.send({ cmd: 'validate_products'}, productsId )
    );

    return {
      ...orderDb,
      OrderItem: orderDb.OrderItem.map( item => ({
        ...item,
        name: products.find( product => product.id === item.productId ).name,
      }))
    };
  }

  async changeStatus(statusDto: StatusDto) {

    const { id, status } = statusDto;

    const order = await this.findOne( id );
    if( order.status === status )
      return order;

    return this.order.update({
      where: {id},
      data: { status }
    });

  }

  async createPaymentSession( order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: "usd",
        items: order.OrderItem.map( item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      })
    )

    return paymentSession;
  }

  async paidOrder( paidOrderDto: PaidOrderDto ) {
    this.logger.log('Paid Order')
    this.logger.log(paidOrderDto);

    const order = await this.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,

        // ? relación 1 a 1
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl
          }
        }
      }
    });

    return { ...order }

  }

}