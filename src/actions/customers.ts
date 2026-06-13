'use server';

// Mock data
const MOCK_CUSTOMERS = [
  { dni: '11111111', email: 'cliente1@ejemplo.com', acceptsMarketing: true },
  { dni: '22222222', email: 'cliente2@ejemplo.com', acceptsMarketing: false },
  { dni: '33333333', email: 'cliente3@ejemplo.com', acceptsMarketing: true },
  { dni: '44444444', email: 'cliente4@ejemplo.com', acceptsMarketing: false },
  { dni: '55555555', email: 'cliente5@ejemplo.com', acceptsMarketing: true },
];

export async function getCustomerByDni(dni: string) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  const customer = MOCK_CUSTOMERS.find((c) => c.dni === dni);
  if (customer) {
    return { success: true, customer };
  }
  return { success: false, customer: null };
}

export async function saveCustomerEmail(dni: string, email: string, acceptsMarketing: boolean) {
  // Simulate network delay and save action
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // En un entorno real, aquí se guardaría en la base de datos
  // Como nos pidió harcodear y simular sin persistir, simplemente devolvemos éxito.
  console.log(`Guardado exitoso: DNI ${dni}, Email: ${email}, Marketing: ${acceptsMarketing}`);
  return { success: true };
}
