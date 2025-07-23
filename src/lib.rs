use borsh::{BorshDeserialize, BorshSerialize};

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
};

entrypoint!(counter_contract);

#[derive(BorshDeserialize, BorshSerialize, Debug)]
enum InstructionType {
    Increment(u32),
    Decrement(u32),
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
struct Counter {
    count: u32,
}

pub fn counter_contract(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Get the account to modify
    let account_info_iter = &mut accounts.iter();
    let counter_account = next_account_info(account_info_iter)?;

    // Ensure it's owned by this program
    if counter_account.owner != program_id {
        msg!("Account does not have the correct program id");
        return Err(solana_program::program_error::ProgramError::IncorrectProgramId);
    }

    // Deserialize the current counter value
    let mut counter = Counter::try_from_slice(&counter_account.data.borrow())?;

    // Match and apply instruction
    match InstructionType::try_from_slice(instruction_data)? {
        InstructionType::Increment(amount) => {
            msg!("Incrementing counter by {}", amount);
            counter.count = counter.count.saturating_add(amount);
        }
        InstructionType::Decrement(amount) => {
            msg!("Decrementing counter by {}", amount);
            counter.count = counter.count.saturating_sub(amount);
        }
    }

    // Serialize the updated counter back into the account
    counter.serialize(&mut &mut counter_account.data.borrow_mut()[..])?;

    Ok(())
}
