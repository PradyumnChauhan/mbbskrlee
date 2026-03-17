import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function SignupSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-3xl font-bold">QBank</h1>
            <p className="text-sm text-muted-foreground">
              Welcome to your learning platform
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Account Created!</CardTitle>
              <CardDescription>
                Your account has been created successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-col gap-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Verify email and wait for admin approval
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We&apos;ve sent you a confirmation email. After email verification, an admin must verify your student account before you can view student panel content.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-center text-sm text-muted-foreground">
                  Once approved by admin, you can log in and start using QBank
                </p>
                <Link href="/auth/login" className="w-full">
                  <Button className="w-full">Go to Login</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
