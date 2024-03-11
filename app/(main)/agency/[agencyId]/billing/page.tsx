import React from 'react'
import { stripe } from '@/lib/stripe'
import { addOnProducts, pricingCards } from '@/lib/constants'
import { db } from '@/lib/db'
import { Separator } from '@/components/ui/separator'
import PricingCard from './_components/pricing-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import clsx from 'clsx'
import SubscriptionHelper from './_components/subscription-helper'

type Props = {
  params: { agencyId: string }
}

const page = async ({ params }: Props) => {
  //CHALLENGE : Create the add on  products
  const addOns = await stripe.products.list({
    ids: addOnProducts.map((product) => product.id),
    expand: ['data.default_price'],
  })

  const agencySubscription = await db.agency.findUnique({
    where: {
      id: params.agencyId,
    },
    select: {
      customerId: true,
      Subscription: true,
    },
  })

  const prices = await stripe.prices.list({
    product: process.env.NEXT_PLURA_PRODUCT_ID,
    active: true,
  })

  const currentPlanDetails = pricingCards.find(
    (c) => c.priceId === agencySubscription?.Subscription?.priceId
  )

  const charges = await stripe.charges.list({
    limit: 50,
    customer: agencySubscription?.customerId,
  })

  const allCharges = [
    ...charges.data.map((charge) => ({
      description: charge.description,
      id: charge.id,
      date: `${new Date(charge.created * 1000).toLocaleTimeString()} ${new Date(
        charge.created * 1000
      ).toLocaleDateString()}`,
      status: 'Zaplatené',
      amount: `$${charge.amount / 100}`,
    })),
  ]

  return (
    <>
      <SubscriptionHelper
        prices={prices.data}
        customerId={agencySubscription?.customerId || ''}
        planExists={agencySubscription?.Subscription?.active === true}
      />
      <h1 className="text-4xl p-4">Účtovanie</h1>
      <Separator className=" mb-6" />
      <h2 className="text-2xl p-4">Aktuálny plán</h2>
      <div className="flex flex-col lg:!flex-row justify-between gap-8">
        <PricingCard
          planExists={agencySubscription?.Subscription?.active === true}
          prices={prices.data}
          customerId={agencySubscription?.customerId || ''}
          amt={
            agencySubscription?.Subscription?.active === true
              ? currentPlanDetails?.price || '€0'
              : '€0'
          }
          buttonCta={
            agencySubscription?.Subscription?.active === true
              ? 'Zmeniť plán'
              : 'Začať'
          }
          highlightDescription="Chcete upraviť svoj plán? Môžete to urobiť tu. Ak máte
          ďalšie otázky, kontaktujte support@syncora.eu"
          highlightTitle="Možnosti plánu"
          description={
            agencySubscription?.Subscription?.active === true
              ? currentPlanDetails?.description || 'Začnime'
              : 'Začnime! Vyberte si plán, ktorý vám najlepšie vyhovuje.'
          }
          duration="/ m"
          features={
            agencySubscription?.Subscription?.active === true
              ? currentPlanDetails?.features || []
              : currentPlanDetails?.features ||
                pricingCards.find((pricing) => pricing.title === 'Starter')
                  ?.features ||
                []
          }
          title={
            agencySubscription?.Subscription?.active === true
              ? currentPlanDetails?.title || 'Začiatočník'
              : 'Začiatočník'
          }
        />
        {addOns.data.map((addOn) => (
          <PricingCard
            planExists={agencySubscription?.Subscription?.active === true}
            prices={prices.data}
            customerId={agencySubscription?.customerId || ''}
            key={addOn.id}
            amt={
              //@ts-ignore
              addOn.default_price?.unit_amount
                ? //@ts-ignore
                  `$${addOn.default_price.unit_amount / 100}`
                : '€0'
            }
            buttonCta="Odoberať"
            description="Vyhradená linka podpory a kanál tímov pre podporu"
            duration="/ m"
            features={[]}
            title={'Prioritná podpora 24/7'}
            highlightTitle="Získajte podporu hneď!"
            highlightDescription="Získajte prioritnú podporu a preskočte dlhé čakanie kliknutím na tlačidlo."
          />
        ))}
      </div>
      <h2 className="text-2xl p-4">História platieb</h2>
      <Table className="bg-card border-[1px] border-border rounded-md">
        <TableHeader className="rounded-md">
          <TableRow>
            <TableHead className="w-[200px]">Popis</TableHead>
            <TableHead className="w-[200px]">ID faktúry</TableHead>
            <TableHead className="w-[300px]">Dátun</TableHead>
            <TableHead className="w-[200px]">Zaplatené</TableHead>
            <TableHead className="text-right">Suma</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="font-medium truncate">
          {allCharges.map((charge) => (
            <TableRow key={charge.id}>
              <TableCell>{charge.description}</TableCell>
              <TableCell className="text-muted-foreground">
                {charge.id}
              </TableCell>
              <TableCell>{charge.date}</TableCell>
              <TableCell>
                <p
                  className={clsx('', {
                    'text-emerald-500': charge.status.toLowerCase() === 'zaplatené',
                    'text-orange-600':
                      charge.status.toLowerCase() === 'čakajúci',
                    'text-red-600': charge.status.toLowerCase() === 'neúspešný',
                  })}
                >
                  {charge.status.toUpperCase()}
                </p>
              </TableCell>
              <TableCell className="text-right">{charge.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

export default page
